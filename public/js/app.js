import * as THREE
    from 'https://cdn.skypack.dev/pin/three@v0.128.0-rCTln0kVGE6riMrX0Nux/mode=imports/optimized/three.js';
import {PCDLoader} from '/js/PCDLoader.js';
import {OrbitControls} from 'https://cdn.skypack.dev/pin/three@v0.128.0-rCTln0kVGE6riMrX0Nux/mode=imports,min/unoptimized/examples/jsm/controls/OrbitControls.js';

let container;
let camera, controls, scene, renderer;
let pcdLoader, loadedFile;
let fontLoader, font;
let initialViewportSettingsSaved = false;

init();
animate();

function init() {

    fetch("./cloudpoints.json")
        .then(response => {
            return response.json();
        })
        .then(cloudPointsList => {
            let loadFile = getCloudPointFromHash(),
                loadFileFound = false;

            var listEl = document.getElementById("explorerList");

            cloudPointsList.forEach(item => {
                let listItem = document.createElement('a');
                let fileName = baseName(item);
                listItem.innerHTML = fileName + '<br>';
                listItem.setAttribute('href', '#f=' + fileName);
                listItem.onclick = function () {
                    loadCloudPoints(item)
                };
                listEl.append(listItem);

                if (fileName === loadFile) {
                    loadFile = item;
                    loadFileFound = true;
                }
            })

            if (loadFileFound) {
                loadCloudPoints(loadFile);
            }
        });

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(renderer.domElement);
    container = document.createElement('div');
    document.body.appendChild(container);
    container.appendChild(renderer.domElement);

    // camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1200);
    camera.position.x = 0.0849549168207146;
    camera.position.y = 3.5028061182970034;
    camera.position.z = -4.691810677626485;
    camera.up.set(0, 1, 0);
    scene.add(camera);

    // controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0); // view direction perpendicular to XY-plane
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.mouseButtons = {LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE};
    controls.panSpeed = 1.0;
    controls.rotateSpeed = 0.2;
    controls.zoomSpeed = 1.2;

    // cloud points loader
    pcdLoader = new PCDLoader();

    // font for helper text
    fontLoader = new THREE.FontLoader();
    fontLoader.load('fonts/helvetiker_regular.typeface.json', function (response) {
        font = response;
    });

    window.addEventListener('resize', onWindowResize);
    document.querySelector('#resetViewportBtn').addEventListener('click', resetViewport);
}

function getCloudPointFromHash() {
    const match = window.location.href.match(/#f=([^&]+)(&|$)/);
    return (match ? match[1] : "");
}

function loadCloudPoints(url) {
    if (scene.children.length > 0) {
        resetViewport();
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }

    pcdLoader.load(url, function (pointsCloud) {
        loadedFile = baseName(url);
        correctObjectRotation(pointsCloud);
        scene.add(pointsCloud);

        fetch(url + '.json')
            .then(response => {
                return response.json();
            })
            .then(json => {

                let objects = json.objects.map(obj => {
                    let map = {
                        'class': obj.classTitle,
                        'geometryType': obj.geometryType,
                        'geometry': null,
                    };

                    let figure = json.figures.find(x => x.objectKey === obj.key);

                    if (typeof figure === 'undefined') {
                        return null
                    }

                    map.geometry = figure.geometry
                    return map
                });

                objects.forEach(obj => {
                    if (!obj) return;

                    drawHelperBoxForObject(obj)
                })
            });

        // axis helper
        //scene.add(new THREE.AxesHelper(20));

        const helper = new THREE.GridHelper( 60, 60 );
        helper.material.opacity = 0.1;
        helper.material.transparent = true;
        scene.add( helper );

        // align camera center
        const center = getPointsCenter();
        controls.target.set(center.x, center.y, center.z);
        controls.update();

        if (!initialViewportSettingsSaved) {
            controls.saveState();
            initialViewportSettingsSaved = true
        }
    });
}

function drawHelperBoxForObject(object) {
    // draw main geometry
    const box = new THREE.BoxGeometry(
        object.geometry.dimensions.x,
        object.geometry.dimensions.y,
        object.geometry.dimensions.z
    );
    // move to coordinates
    box.translate(
        object.geometry.position.x,
        object.geometry.position.y,
        object.geometry.position.z
    );

    //let color = '#ff0000';
    const mesh = new THREE.Mesh(box, new THREE.MeshBasicMaterial(0xff0000));
    correctObjectRotation(mesh);
    const helper = new THREE.BoxHelper(mesh, 0xff0000);
    scene.add(helper);

    scene.updateMatrixWorld(true);
}

function correctObjectRotation(object) {
    object.rotateX(1.5);
    object.rotateZ(3.1);
    object.rotateY(-0.1);
    object.position.y += 5.5
}

function resetViewport() {
    //console.log(camera.position.x, camera.position.y, camera.position.z);
    controls.reset();
}

function getPointsCenter() {
    const pointsCloud = scene.getObjectByName(loadedFile);
    return pointsCloud.geometry.boundingSphere.center;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function baseName(str) {
    return String(str).substring(str.lastIndexOf('/') + 1);
}

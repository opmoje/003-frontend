import * as THREE
    from 'https://cdn.skypack.dev/pin/three@v0.128.0-rCTln0kVGE6riMrX0Nux/mode=imports/optimized/three.js';
import {PCDLoader} from '/js/PCDLoader.js';
import {OrbitControls} from 'https://cdn.skypack.dev/pin/three@v0.128.0-rCTln0kVGE6riMrX0Nux/mode=imports,min/unoptimized/examples/jsm/controls/OrbitControls.js';

let container;
let camera, controls, scene, renderer;
let pcdLoader, loadedFile;
let fontLoader, font;
let lastViewportSettingsSaved = false;

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

            var listEl = document.getElementById("explorer");
            cloudPointsList.forEach(item => {
                let listItem = document.createElement('a');
                let fileName = baseName(item);
                listItem.innerHTML = fileName + '<br>';
                listItem.setAttribute('href', '#f=' + fileName);
                listItem.onclick = function () {
                    loadCloudPoints(item)
                };
                listEl.append(listItem)

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

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 40);
    camera.position.x = 0.4;
    camera.position.z = -1;
    camera.up.set(0, -1, 0);
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth - 260, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    pcdLoader = new PCDLoader();
    fontLoader = new THREE.FontLoader();
    fontLoader.load( 'fonts/helvetiker_regular.typeface.json', function ( response ) {
        font = response;
    } );

    container = document.createElement('div');
    document.body.appendChild(container);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0); // view direction perpendicular to XY-plane
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.mouseButtons = {LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE};
    controls.panSpeed = 1.0;
    controls.rotateSpeed = 0.2;
    controls.zoomSpeed = 1.2;

    window.addEventListener('resize', onWindowResize);
    document.querySelector('#resetViewportBtn').addEventListener('click', resetViewport);

}

function getCloudPointFromHash() {
    const match = window.location.href.match(/#f=([^&]+)(&|$)/);
    return (match ? match[1] : "");
}

function loadCloudPoints(url) {
    if (scene.children.length > 0) {
        resetViewport()
        while (scene.children.length > 0) {
            scene.remove(scene.children[0]);
        }
    }

    pcdLoader.load(url, function (points) {
        loadedFile = baseName(url);
        scene.add(points);

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
                    if (!obj) {
                        return
                    }

                    drawHelperBox(obj)
                })


                /*const geometry = new THREE.BoxGeometry(0.5752128333615767, 0.5480897912194335, 2.8561831118359504);
                geometry.translate(0.13521005088371357, 0.08174636110693423, 3.9492046827173195);
                const object = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial(0xff0000));
                const box = new THREE.BoxHelper(object, 0xffff00);
                scene.add(box);*/
            });

        const center = getPointsCenter();
        controls.target.set(center.x, center.y, center.z);

        if (!lastViewportSettingsSaved) {
            controls.saveState();
            lastViewportSettingsSaved = true
        }

        controls.update();
    });
}

function drawHelperBox(object) {
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
    const helper = new THREE.BoxHelper(mesh, 0xff0000);
    scene.add(helper);

    // draw label
    const text = new THREE.TextGeometry( object.class, {
        font: font,
        size: 0.05,
        height: 0,
    });
    text.computeBoundingBox();
    let textMesh1 = new THREE.Mesh( text, new THREE.MeshBasicMaterial(0xff0000));
    textMesh1.position.x = object.geometry.position.x + object.geometry.dimensions.x / 2 + 0.03;
    textMesh1.position.y = object.geometry.position.y + object.geometry.dimensions.y / 2 + 0.03;
    textMesh1.position.z = object.geometry.position.z - object.geometry.dimensions.z / 2;
    textMesh1.rotation.z = 3.15;
    textMesh1.rotation.y = 3.1;
    scene.add( textMesh1 );
}

function resetViewport() {
    if (loadedFile) {
        const center = getPointsCenter();
        controls.target.set(center.x, center.y, center.z);
        camera.lookAt(center);
        controls.reset();
    }

}

function getPointsCenter() {
    const points = scene.getObjectByName(loadedFile);
    return points.geometry.boundingSphere.center;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth - 260, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function baseName(str) {
    return String(str).substring(str.lastIndexOf('/') + 1);
}

import * as THREE
    from 'https://cdn.skypack.dev/pin/three@v0.128.0-rCTln0kVGE6riMrX0Nux/mode=imports/optimized/three.js';
import {PCDLoader} from '/js/PCDLoader.js';
import {OrbitControls} from 'https://cdn.skypack.dev/pin/three@v0.128.0-rCTln0kVGE6riMrX0Nux/mode=imports,min/unoptimized/examples/jsm/controls/OrbitControls.js';

let container;
let camera, controls, scene, renderer;
let loader, loadedFile;
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

    loader = new PCDLoader();

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

    loader.load(url, function (points) {
        loadedFile = baseName(url);
        scene.add(points);
        const center = getPointsCenter();
        controls.target.set(center.x, center.y, center.z);

        if (!lastViewportSettingsSaved) {
            controls.saveState();
            lastViewportSettingsSaved = true
        }

        controls.update();
    });
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

import * as THREE from 'three';
import GSAP from 'gsap';


const canvas = document.querySelector('canvas');

const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
})

// make renderer with transparent background
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(11, 2, 0.1, 300);
const light = new THREE.PointLight(0xffffff, 10000);
light.position.set(10, 100, -10);
light.castShadow = true;
light.shadow.mapSize.width = 1024 * 1000; // Optional
light.shadow.mapSize.height = 1024 * 1000; // Optional
light.shadow.camera.near = 0.01; // Optional
light.shadow.camera.far = 500; // Optional
light.shadow.needsUpdate = true; // Optional
light.shadow.autoUpdate = true; // Optional
scene.add(light);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);


const boxMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x2a5b7c,
    metalness: -1,
    roughness: 2,
    castShadow: true,
});
// Create rounded corner shape
const cornerRadius = 0.05;

// const geometry = createRoundedCubeGeometry(1, 0.25, 1, cornerRadius);
const geometry = createRoundedCubeGeometry({
    width: 1,
    height: 0.25,
    depth: 1,
    radius: cornerRadius,
});


const spacing = 0.1

const serverRack1 = new THREE.Mesh(
    geometry,
    boxMaterial
);
serverRack1.position.y = 0;

const serverRack2 = new THREE.Mesh(
    geometry,
    boxMaterial
);
serverRack2.position.y = 0.25 + spacing;

const serverRack3 = new THREE.Mesh(
    geometry,
    boxMaterial
);
serverRack3.position.y = (0.25 + spacing) * 2;

const screenMaterial = new THREE.MeshLambertMaterial({
    color: 0x00b2b2,
    emissive: 0x00b2b2,
    emissiveIntensity: 1,
})

const serverScreen1 = new THREE.Mesh(
    // new THREE.PlaneGeometry(0.5, 0.15),
    createRoundedPlaneGeometry({
        width: 0.5,
        height: 0.125,
        radius: 0.04,
    }),
    screenMaterial
);
serverScreen1.position.z = 1 - 0.4995;
serverScreen1.position.y = (0.25 + spacing) + 0.1;
serverScreen1.position.x = -0.05;

const serverButton1 = new THREE.Mesh(
    createRoundedPlaneGeometry({
        width: 0.125 * 0.5,
        height: 0.125 * 0.5,
        radius: 0.01,
    }),
    screenMaterial,
)

serverButton1.position.z = 1 - 0.4995;
serverButton1.position.y = (0.25 + spacing) + 0.135;
serverButton1.position.x = 0.3;

const serverButton2 = serverButton1.clone()
const serverButton3 = serverButton1.clone()
const serverButton4 = serverButton1.clone()

const buttonsSpacing = 0.08
serverButton2.position.x += buttonsSpacing;
serverButton3.position.x += buttonsSpacing;
serverButton3.position.y -= buttonsSpacing;
serverButton4.position.y -= buttonsSpacing;

const serverButton5 = serverButton1.clone()
serverButton5.position.y = -0.25;
serverButton5.position.x = -0.3;
const serverButton6 = serverButton5.clone()
serverButton6.position.x += buttonsSpacing;
const serverButton7 = serverButton6.clone()
serverButton7.position.x += buttonsSpacing;

const serverLine = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.01),
    screenMaterial,
)

serverLine.position.z = serverButton1.position.z + 0.01;
serverLine.position.y = 0.1;
serverLine.position.x = -0.1;


// const serverCable = new THREE.Mesh(
//     new THREE.CylinderGeometry(0.01, 0.01, 0.5, 32),
//     new THREE.MeshPhysicalMaterial({
//         color: 0x000000,
//         metalness: 0.5,
//         roughness: 0.5,
//     })
// )

const server = new THREE.Group()
serverRack1.castShadow = true;
serverRack1.receiveShadow = true;
serverRack2.castShadow = true;
serverRack2.receiveShadow = true;
serverRack3.castShadow = true;
serverRack3.receiveShadow = true;
server.castShadow = true


// server.receiveShadow = true
server.add(
    serverRack1,
    serverRack2,
    serverRack3,
    serverScreen1,
    serverButton1,
    serverButton2,
    serverButton3,
    serverButton4,
    serverButton5,
    serverButton6,
    serverButton7,
    serverLine,
)
server.position.x = 0.25 / 2 * 10
server.position.y = 0.35 * 10
// server.position.x = 0.25 / 2
server.scale.setScalar(10)

const serverPlot = new THREE.Group()
serverPlot.add(server)

const additionalLight = new THREE.DirectionalLight(0xffffff, 1); // Example of additional light
additionalLight.position.set(10, 0, -10);
serverPlot.add(additionalLight);

const additionalLight2 = new THREE.DirectionalLight(0xffffff, 0.25); // Example of additional light
additionalLight2.position.set(0, 0, 100);
serverPlot.add(additionalLight2);

scene.add(serverPlot);



camera.position.set(0, 100, 150);

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20000, 20000),
    new THREE.MeshLambertMaterial({
        // color: 0x0f172a,
        // color: 0xffffff,
        opacity: 1, // Adjust transparency level as needed
        transparent: true, // Enable transparency
        side: THREE.FrontSide, // Ensure it can receive shadows from both sides
        emissiveIntensity: 0.5,
    })
);

// hsl(222.22deg 47.37% 11.18%) 
// hsl(222.63deg 44.19% 16.86%)

ground.rotation.x = -Math.PI / 2;

ground.position.y = -0.5 * 10;
ground.position.x = -1000;
ground.position.z = -1000;

ground.receiveShadow = true;
scene.add(ground);


const cableY = ground.position.y + 1
const cableY2 = 2

const cables = new THREE.Group();

const cablesPoints = [
    [
        { y: cableY, x: -18, z: -34 },
        { y: cableY, x: -18, z: -26 },
        { y: cableY, x: -12, z: -26 },
        { y: cableY, x: -12, z: -12 },
        { y: cableY, x: 0, z: -12 },
        { y: cableY, x: 0, z: 0 },
        { y: cableY2, x: 0, z: 0 },
    ],
    [
        { y: cableY, x: -2, z: -30 },
        { y: cableY, x: -2, z: -18 },
        { y: cableY, x: -6, z: -18 },
        { y: cableY, x: -6, z: -10 },
        { y: cableY, x: 0, z: -10 },
        { y: cableY, x: 0, z: 0 },
        { y: cableY2, x: 0, z: 0 },
    ],
    [
        { y: cableY, x: 4, z: -20 },
        { y: cableY, x: 4, z: -14 },
        { y: cableY, x: 2, z: -14 },
        { y: cableY, x: 2, z: -5 },
        { y: cableY, x: 0, z: -5 },
        { y: cableY, x: 0, z: 0 },
        { y: cableY2, x: 0, z: 0 },
    ]
]


// back cables = 
cables.add(...cablesPoints.map(points => createCable({ points })))
// right cables
cables.add(...cablesPoints.map(points => createCable({
    points: points.map(point => ({
        ...point,
        z: point.x * - 1,
        x: point.z * - 1,
    }))
})))
// front cables
cables.add(...cablesPoints.map(points => createCable({
    points: points.map(point => ({
        ...point,
        z: point.z * - 1,
    })).reverse()
})))
// left cables
cables.add(...cablesPoints.map(points => createCable({
    points: points.map(point => ({
        ...point,
        z: point.x + 2,
        x: point.z,
    }))
})))

// cables.add(
//     createCable({
//         points: [
//             { y: cableY, x: -18, z: -34 },
//             { y: cableY, x: -18, z: -26 },
//             { y: cableY, x: -12, z: -26 },
//             { y: cableY, x: -12, z: -12 },
//             { y: cableY, x: 0, z: -12 },
//             { y: cableY, x: 0, z: 0 },
//             { y: cableY2, x: 0, z: 0 },
//         ]
//     }),
//     createCable({
//         points: [
//             { y: cableY, x: -2, z: -30 },
//             { y: cableY, x: -2, z: -18 },
//             { y: cableY, x: -6, z: -18 },
//             { y: cableY, x: -6, z: -10 },
//             { y: cableY, x: 0, z: -10 },
//             { y: cableY, x: 0, z: 0 },
//             { y: cableY2, x: 0, z: 0 },
//         ]
//     }),
//     createCable({
//         points: [
//             { y: cableY, x: 4, z: -20 },
//             { y: cableY, x: 4, z: -14 },
//             { y: cableY, x: 2, z: -14 },
//             { y: cableY, x: 2, z: -5 },
//             { y: cableY, x: 0, z: -5 },
//             { y: cableY, x: 0, z: 0 },
//             { y: cableY2, x: 0, z: 0 },
//         ]
//     }),
//     createCable({
//         points: [
//             { y: cableY, z: -1 * -18, x: -1 * -34 },
//             { y: cableY, z: -1 * -18, x: -1 * -26 },
//             { y: cableY, z: -1 * -12, x: -1 * -26 },
//             { y: cableY, z: -1 * -12, x: -1 * -12 },
//             { y: cableY, z: -1 * 0, x: -1 * -12 },
//             { y: cableY, z: -1 * 0, x: -1 * 0 },
//             { y: cableY2, z: -1 * 0, x: -1 * 0 },
//         ]
//     }),
//     createCable({
//         points: [
//             { y: cableY, z: -1 * -2, x: -1 * -30 },
//             { y: cableY, z: -1 * -2, x: -1 * -18 },
//             { y: cableY, z: -1 * -6, x: -1 * -18 },
//             { y: cableY, z: -1 * -6, x: -1 * -10 },
//             { y: cableY, z: -1 * 0, x: -1 * -10 },
//             { y: cableY, z: -1 * 0, x: -1 * 0 },
//             { y: cableY2, z: -1 * 0, x: -1 * 0 },
//         ]
//     }),
//     createCable({
//         points: [
//             { y: cableY, z: -1 * 4, x: -1 * -20 },
//             { y: cableY, z: -1 * 4, x: -1 * -14 },
//             { y: cableY, z: -1 * 2, x: -1 * -14 },
//             { y: cableY, z: -1 * 2, x: -1 * -5 },
//             { y: cableY, z: -1 * 0, x: -1 * -5 },
//             { y: cableY, z: -1 * 0, x: -1 * 0 },
//             { y: cableY2, z: -1 * 0, x: -1 * 0 },
//         ]
//     }),
//     // reversed
// )

// ca
serverPlot.add(cables)
serverPlot.rotation.y = Math.PI / -4


function isLargeScreen() {
    return window.matchMedia("(min-width: 768px)").matches;
}
function resizeRendererToDisplaySize() {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}


const center = new THREE.Vector3(0, 0, 0);
server.scale.setScalar(9)

GSAP.timeline().add([
    GSAP.fromTo(server.position,
        {
            y: 0.35 * 10,
        },
        {
            y: (0.35 + 0.12) * 10,
            duration: 2.5,
            delay: 0,
            ease: 'power1.inOut',
            yoyo: true,
            repeat: -1,
        }
    ),
    GSAP.fromTo(light.position,
        {
            y: 100,
        },
        {
            y: 90,
            duration: 2.5,
            delay: 0,
            ease: 'power1.inOut',
            yoyo: true,
            repeat: -1,
        }
    ),
    // GSAP.to(camera.position, {
    //     y: 80,
    //     x: 120,
    //     z: 80,
    //     delay: 2,
    //     ease: 'power1.inOut',
    //     duration: 5,
    // })
])




function render() {
    const bgColor = getComputedStyle(document.body)?.backgroundColor;
    ground.material.color.set(bgColor);
    ground.material.emissive.set(bgColor);
    camera.lookAt(center)
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

requestAnimationFrame(render);


function createRoundedCubeGeometry({
    width: _width, height: _height, depth: _depth,
    radius,
}) {

    const width = _width;
    const height = _depth
    const depth = _height;

    // Define parameters for the beveled cube
    const bevelSize = 0;
    const bevelSegments = 0;
    const bevelEnabled = true;

    // Define the shape of the beveled cube
    const shape = new THREE.Shape();
    shape.moveTo(0, radius);
    shape.lineTo(0, height - radius);
    shape.quadraticCurveTo(0, height, radius, height);
    shape.lineTo(width - radius, height);
    shape.quadraticCurveTo(width, height, width, height - radius);
    shape.lineTo(width, radius);
    shape.quadraticCurveTo(width, 0, width - radius, 0);
    shape.lineTo(radius, 0);
    shape.quadraticCurveTo(0, 0, 0, radius);



    // Extrude the shape to create the beveled cube geometry
    const extrudeSettings = {
        steps: 1,
        depth: depth,
        bevelEnabled: bevelEnabled,
        bevelThickness: bevelSize,
        bevelSize: bevelSize,
        bevelSegments: bevelSegments
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(-width / 2, -depth / 2, -height / 2);
    return geometry
}

function createRoundedPlaneGeometry({
    width: _width, height: _height, radius,
}) {
    const width = _width;
    const height = _height;

    // Define parameters for the beveled cube
    const bevelSize = 0;
    const bevelSegments = 0;
    const bevelEnabled = true;

    // Define the shape of the beveled cube
    const shape = new THREE.Shape();
    shape.moveTo(0, radius);
    shape.lineTo(0, height - radius);
    shape.quadraticCurveTo(0, height, radius, height);
    shape.lineTo(width - radius, height);
    shape.quadraticCurveTo(width, height, width, height - radius);
    shape.lineTo(width, radius);
    shape.quadraticCurveTo(width, 0, width - radius, 0);
    shape.lineTo(radius, 0);
    shape.quadraticCurveTo(0, 0, 0, radius);

    // Extrude the shape to create the beveled cube geometry
    const extrudeSettings = {
        steps: 1,
        depth: 0.01,
        bevelEnabled: bevelEnabled,
        bevelThickness: bevelSize,
        bevelSize: bevelSize,
        bevelSegments: bevelSegments
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(-width / 2, -height / 2, -0.01 / 2);
    return geometry
}



/**
 * 
 * @param {{
 *  points: {x: number, y: number, z: number}[]   
 * }} param0 
 */
function createCable({
    points = []
}) {

    const cable = new THREE.Group();

    const cableDataGeometry = new THREE.SphereGeometry(0.2, 7, 7);
    const cableDataMaterial = new THREE.MeshLambertMaterial({
        color: 0x50eae5,
        emissive: 0x50eae5,
        emissiveIntensity: 1,
    })

    const path = new THREE.CatmullRomCurve3(points.map(v => new THREE.Vector3(v.x, v.y, v.z)));

    // Define the tube geometry
    const tubeGeometry = new THREE.TubeGeometry(path, 128, 0.1, 2, false);

    // Create material
    const material = new THREE.LineDashedMaterial({
        color: 0x00b2b2,
        dashSize: 100,    // Length of the dash
        gapSize: 1000,     // Length of the gap
    });

    // Create tube mesh
    const line = new THREE.Line(tubeGeometry, material);

    // line.computeLineDistances();

    // Create points of light
    const pointsOfLight = [];
    const numPointsOfLight = 10; // Number of points of light
    for (let i = 0; i < numPointsOfLight; i++) {
        const pointOfLight = new THREE.Mesh(
            cableDataGeometry,
            cableDataMaterial
        );
        pointsOfLight.push(pointOfLight);
        cable.add(pointOfLight);
    }

    // GSAP animation
    const tl = GSAP.timeline({ repeat: -1 });
    tl.to(pointsOfLight, {
        duration: 5, // Duration of animation
        onUpdate: function () {
            const t = tl.progress();
            for (let i = 0; i < pointsOfLight.length; i++) {
                const pointAt = ((Math.max(0, t + (i / pointsOfLight.length)) * 100) % 100) / 100;
                const position = path.getPointAt(pointAt);
                if (position) {
                    pointsOfLight[i].position.copy(position);
                }
            }
        },
        ease: 'power1.inOut' // Easing function
    });
    cable.add(line)
    return cable;
}


function resize() {
    if (resizeRendererToDisplaySize()) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        light.shadow.camera.updateProjectionMatrix();
        if (isLargeScreen()) {
            scene.position.x = 7.5
            scene.position.z = 0//-7.5
            // scene.scale.setScalar(1)
        } else {
            scene.scale.setScalar(0.5)
            scene.position.x = 0 // (15 * (sy))
            scene.position.z = 17.5 // (15 * (sy))
        }
    }
}
window.addEventListener('resize', resize)
resize()

window.addEventListener("mousemove", (event) => {
    Object.assign(
        scene.rotation,
        {
            y: -(event.clientX / window.innerWidth + window.innerWidth / 2) * Math.PI / 12,
            x: -(event.clientY / window.innerHeight + window.innerHeight / 2) * Math.PI / 12,
            // z: -(event.clientY / window.innerHeight + window.innerHeight / 2) * Math.PI / 12,
        }
    )
})


let devicemotion = { x: 0, y: 0, z: 0 };
window.addEventListener('devicemotion', e => {
    const orientation = (() => {
        if (screen.orientation) {
            return screen.orientation.type;
        }

        switch (window.orientation) {
            default:
            case 0:
                return "portrait-primary";
            case 180:
                return "portrait-secondary";
            case 90:
                return "landscape-primary";
            case -90:
                return "landscape-secondary";
        }
    })();

    const flipper = orientation.includes("primary") ? 1 : -1;
    const alpha =
        flipper *
        (e.rotationRate?.[
            orientation.includes("portrait") ? "alpha" : "beta"
        ] || 0),
        beta =
            flipper *
            (e.rotationRate?.[
                orientation.includes("portrait") ? "beta" : "alpha"
            ] || 0),
        gamma = e.rotationRate?.gamma || 0;

    devicemotion.y = containedBetween(-Math.PI / 24, Math.PI / 24)(devicemotion.y + (-gamma) / 360 * Math.PI / 12 );
    devicemotion.x = containedBetween(-Math.PI / 24, Math.PI / 24)(devicemotion.x + (-alpha) / 360 * Math.PI / 12 ) * 0.5;

    Object.assign(
        scene.rotation,
        devicemotion
    )
})

function containedBetween(min, max) {
    return (value) => Math.min(max, Math.max(min, value));
}
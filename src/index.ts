import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import dat from 'dat.gui';
import './noise.js';

(async () => {
	const config = {
		curtain: {
			patternRepeat: 4,
			width: 1.5,
			height: 2,
			resolution: 100,
			roughness: 1,
			metalness: 0.4,
			sheen: 0.07,
			sheenRoughness: 0.5,
			sheenColor: 0xffffff,
			folds: {
				folds1: {
					folds: 5,
					foldDepth: 0.025,
				},
				folds2: {
					folds: 8,
					foldDepth: 0.01,
				},
			},
		},
		lights: {
			ambient: {
				color: 0xfff8e7,
				intensity: 3,
			},
			mainLight: {
				color: 0xfff8e7,
				intensity: 27,
				position: {
					x: 1,
					y: 2.7,
					z: -2.64,
				},
			},
			secondaryLight: {
				color: 0xfff8e7,
				intensity: 7,
				position: {
					x: -3,
					y: -2.75,
					z: -4.2,
				},
			},
		},
	};

	const gui = new dat.GUI();

	const scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000
	);
	camera.position.z = -2;

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.outputEncoding = THREE.sRGBEncoding;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.physicallyCorrectLights = true;
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.VSMShadowMap;
	renderer.setClearColor(0xc9c9c9);
	document.body.appendChild(renderer.domElement);

	const orbit = new OrbitControls(camera, renderer.domElement);

	const floor = new THREE.Mesh(
		new THREE.PlaneBufferGeometry(5, 5, 5, 5),
		new THREE.MeshPhysicalMaterial({
			color: 0x333333,
			roughness: 0.5,
			metalness: 0.5,
			reflectivity: 0.5,
		})
	);
	// floor.castShadow = true;
	floor.receiveShadow = true;
	floor.rotateX(-Math.PI / 2);
	floor.position.y = -config.curtain.height / 2;

	const curtain = new THREE.Mesh(
		new THREE.PlaneBufferGeometry(
			config.curtain.width,
			config.curtain.height,
			config.curtain.resolution,
			config.curtain.resolution
		),
		new THREE.MeshPhysicalMaterial({ color: 0x363636, side: THREE.DoubleSide })
	);

	curtain.castShadow = true;
	curtain.receiveShadow = true;
	curtain.rotateY(Math.PI);

	const curtainFolder = gui.addFolder('Curtain');

	const l = config.lights;

	const ambientLight = new THREE.AmbientLight(
		l.ambient.color,
		l.ambient.intensity
	);

	const mainLight = new THREE.PointLight(
		l.mainLight.color,
		l.mainLight.intensity
	);
	mainLight.position.set(
		l.mainLight.position.x,
		l.mainLight.position.y,
		l.mainLight.position.z
	);
	// const mainLightHelper = new THREE.PointLightHelper(mainLight);
	// scene.add(mainLightHelper);
	mainLight.castShadow = true;
	mainLight.shadow.mapSize = new THREE.Vector2(2048, 2048);
	mainLight.shadow.bias = -0.00001;

	const secondaryLight = new THREE.PointLight(
		l.secondaryLight.color,
		l.secondaryLight.intensity
	);
	secondaryLight.position.set(
		l.secondaryLight.position.x,
		l.secondaryLight.position.y,
		l.secondaryLight.position.z
	);
	// const secondaryLightHelper = new THREE.PointLightHelper(secondaryLight);
	// scene.add(secondaryLightHelper);
	secondaryLight.castShadow = true;
	secondaryLight.shadow.mapSize = new THREE.Vector2(2048, 2048);
	secondaryLight.shadow.bias = -0.00001;

	const folderMainLight = gui.addFolder('Main Light');
	folderMainLight.add(mainLight, 'intensity', 0, 100);
	folderMainLight.add(mainLight.position, 'x', -5, 5);
	folderMainLight.add(mainLight.position, 'y', -5, 5);
	folderMainLight.add(mainLight.position, 'z', -5, 5);

	const folderSecondaryLight = gui.addFolder('Secondary Light');
	folderSecondaryLight.add(secondaryLight, 'intensity', 0, 100);
	folderSecondaryLight.add(secondaryLight.position, 'x', -5, 5);
	folderSecondaryLight.add(secondaryLight.position, 'y', -5, 5);
	folderSecondaryLight.add(secondaryLight.position, 'z', -5, 5);

	const folderAmbientLight = gui.addFolder('Ambient Light');
	folderAmbientLight.add(ambientLight, 'intensity', 0, 100);

	scene.add(curtain, floor, mainLight, ambientLight, secondaryLight);

	const applySin = (mesh: THREE.Mesh) => {
		const geometry = mesh.geometry;
		const positionAttribute = geometry.getAttribute('position');
		const vertex = new THREE.Vector3();
		const { folds1, folds2 } = config.curtain.folds;
		for (let i = 0; i < positionAttribute.count; i++) {
			vertex.fromBufferAttribute(positionAttribute, i);
			const angle = Math.PI * (vertex.x * 2);
			const wave1 = folds1.foldDepth * Math.sin(angle * folds1.folds);
			const wave2 = folds2.foldDepth * Math.sin(angle * folds2.folds);
			const wave = wave1 + wave2;
			vertex.z = wave;
			positionAttribute.setZ(i, vertex.z);
		}
		positionAttribute.needsUpdate = true;
	};

	const applyNoise = (
		mesh: THREE.Mesh,
		scale: number,
		axes: string = 'xyz'
	) => {
		const noiseOffset = (Math.random() - 0.5) * 2 * 9999999;
		const geometry = mesh.geometry;
		const positionAttribute = geometry.getAttribute('position');
		const vertex = new THREE.Vector3();
		let alterX,
			alterY,
			alterZ = false;
		axes
			.toLowerCase()
			.split('')
			.forEach((axis) => {
				if (axis === 'x') alterX = true;
				if (axis === 'y') alterY = true;
				if (axis === 'z') alterZ = true;
			});
		for (let i = 0; i < positionAttribute.count; i++) {
			vertex.fromBufferAttribute(positionAttribute, i);
			const n =
				//@ts-ignore
				noise.perlin3(
					vertex.x + noiseOffset,
					vertex.y + noiseOffset,
					vertex.z + noiseOffset
				) * scale;
			vertex.x += alterX ? n : 0;
			vertex.y += alterY ? n : 0;
			vertex.z += alterZ ? n : 0;
			positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
		}
		positionAttribute.needsUpdate = true;
	};

	applySin(curtain);
	applyNoise(curtain, 0.05);
	applyNoise(curtain, 0.01, 'xy');
	applyNoise(curtain, 0.1, 'z');

	curtain.geometry.computeVertexNormals();

	const render = () => {
		requestAnimationFrame(render);
		orbit.update();
		renderer.render(scene, camera);
	};

	const textureLoader = new THREE.TextureLoader();

	const texture = await textureLoader.load('./fabric_pattern_07_col_1_1k.png');
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.anisotropy = 16;

	const roughMap = await textureLoader.load('./fabric_pattern_07_rough_1k.png');
	roughMap.wrapS = THREE.RepeatWrapping;
	roughMap.wrapT = THREE.RepeatWrapping;
	roughMap.anisotropy = 16;

	const normalMap = await textureLoader.load(
		'./fabric_pattern_07_nor_gl_1k.png'
	);
	normalMap.wrapS = THREE.RepeatWrapping;
	normalMap.wrapT = THREE.RepeatWrapping;
	normalMap.anisotropy = 16;

	const aoMap = await textureLoader.load('./fabric_pattern_07_ao_1k.png');
	aoMap.wrapS = THREE.RepeatWrapping;
	aoMap.wrapT = THREE.RepeatWrapping;
	aoMap.anisotropy = 16;

	const ratio = config.curtain.width / config.curtain.height;
	texture.repeat = new THREE.Vector2(
		config.curtain.patternRepeat,
		config.curtain.patternRepeat * (1 + ratio)
	);
	curtain.material.map = texture;
	curtain.material.aoMap = aoMap;
	curtain.material.normalMap = normalMap;
	curtain.material.roughnessMap = roughMap;
	curtain.material.roughness = config.curtain.roughness;
	curtain.material.metalness = config.curtain.metalness;
	curtain.material.sheen = config.curtain.sheen;
	curtain.material.sheenRoughness = config.curtain.sheenRoughness;
	curtain.material.sheenColor = new THREE.Color(config.curtain.sheenColor);
	curtainFolder.add(curtain.material, 'roughness', 0, 1);
	curtainFolder.add(curtain.material, 'metalness', 0, 1);
	curtainFolder.add(curtain.material, 'sheen', 0, 1);
	curtainFolder.add(curtain.material, 'sheenRoughness', 0, 1);

	render();
})();

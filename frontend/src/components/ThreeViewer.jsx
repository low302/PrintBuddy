import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';

export default function ThreeViewer({ fileUrl, extension, className = "" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.6);
    directional.position.set(100, 100, 100);
    scene.add(directional);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    let object3d = null;

    const fitCameraToObject = (object) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
      cameraZ *= 1.6;
      camera.position.set(center.x, center.y, cameraZ);
      controls.target.copy(center);
      controls.update();
    };

    const loadModel = async () => {
      const ext = (extension || '').toLowerCase();
      if (ext === 'stl') {
        const loader = new STLLoader();
        loader.load(fileUrl, (geometry) => {
          const material = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.1, roughness: 0.6 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.rotation.x = -Math.PI / 2;
          object3d = mesh;
          scene.add(mesh);
          fitCameraToObject(mesh);
        });
        return;
      }

      const loader = new ThreeMFLoader();
      loader.load(fileUrl, (group) => {
        object3d = group;
        scene.add(group);
        fitCameraToObject(group);
      });
    };

    loadModel();

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (object3d) {
        scene.remove(object3d);
      }
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [fileUrl]);

  return <div ref={mountRef} className={`w-full rounded-lg border border-border ${className}`} />;
}

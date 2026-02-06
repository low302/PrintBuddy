import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";

export default function ModelThumbnail({ fileUrl, extension }) {
  const [thumbnail, setThumbnail] = useState(null);
  const [hasError, setHasError] = useState(false);
  const requestRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const renderThumbnail = () => {
      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      const width = 320;
      const height = 180;
      renderer.setSize(width, height);
      renderer.setPixelRatio(1);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b1120);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 120);

      const ambient = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambient);

      const directional = new THREE.DirectionalLight(0xffffff, 0.6);
      directional.position.set(80, 100, 120);
      scene.add(directional);

      const fitCameraToObject = (object) => {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.6;
        camera.position.set(center.x, center.y, cameraZ);
        camera.lookAt(center);
      };

      const onLoaded = (object) => {
        fitCameraToObject(object);
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL("image/png");
        if (!cancelled) {
          setThumbnail(dataUrl);
        }
        renderer.dispose();
      };

      const onError = () => {
        if (!cancelled) {
          setHasError(true);
        }
        renderer.dispose();
      };

      const ext = (extension || "").toLowerCase();
      if (ext === "stl") {
        const loader = new STLLoader();
        loader.load(
          fileUrl,
          (geometry) => {
            const material = new THREE.MeshStandardMaterial({
              color: 0x94a3b8,
              metalness: 0.1,
              roughness: 0.6,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI / 2;
            scene.add(mesh);
            onLoaded(mesh);
          },
          undefined,
          onError
        );
        return;
      }

      const loader = new ThreeMFLoader();
      loader.load(
        fileUrl,
        (group) => {
          scene.add(group);
          onLoaded(group);
        },
        undefined,
        onError
      );
    };

    requestRef.current = window.requestAnimationFrame(renderThumbnail);

    return () => {
      cancelled = true;
      if (requestRef.current) {
        window.cancelAnimationFrame(requestRef.current);
      }
    };
  }, [fileUrl, extension]);

  if (hasError) {
    return (
      <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        Preview unavailable
      </div>
    );
  }

  if (!thumbnail) {
    return (
      <div className="flex h-36 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-xs text-muted-foreground">
        Generating preview...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-muted/30">
      <img src={thumbnail} alt="Model thumbnail" className="h-36 w-full object-cover" />
    </div>
  );
}

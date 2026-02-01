import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, TorusKnot, Box, Plane, Instance, Instances, Sphere, Torus, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { getAudioGraph } from '../services/audioUtils';
import { AppConfig } from '../types';

interface Visualizer3DProps {
  mode: AppConfig['visualizerMode'];
}

/**
 * ENGINE 1: Particle Sphere (Particula Logic)
 */
const ParticleSphere = () => {
  const points = useRef<THREE.Points>(null);
  const count = 3000;
  
  const [positions, initialPositions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const initPos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
      
      initPos[i * 3] = x;
      initPos[i * 3 + 1] = y;
      initPos[i * 3 + 2] = z;
    }
    return [pos, initPos];
  }, []);

  useFrame((state) => {
    if (!points.current) return;
    const graph = getAudioGraph();
    const bass = graph.getBassEnergy() / 255; 
    const avg = graph.getAverageFrequency() / 255;
    
    const positionsAttribute = points.current.geometry.attributes.position;
    
    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;
      
      const ox = initialPositions[ix];
      const oy = initialPositions[iy];
      const oz = initialPositions[iz];
      
      const expansion = 1 + (bass * 0.5) + (Math.sin(state.clock.elapsedTime * 2 + i) * 0.1 * avg);
      
      positionsAttribute.setXYZ(i, ox * expansion, oy * expansion, oz * expansion);
    }
    
    positionsAttribute.needsUpdate = true;
    points.current.rotation.y += 0.002 + (avg * 0.01);
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.15} color="#00f2ff" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
    </points>
  );
};

/**
 * ENGINE 2: Geometry Morph (Box -> Cylinder -> Torus)
 */
const GeometryMorph = () => {
    const mesh = useRef<THREE.Mesh>(null);
    const [shapeIndex, setShapeIndex] = useState(0); // 0=Box, 1=Cylinder, 2=Torus

    useFrame((state) => {
        if (!mesh.current) return;
        const graph = getAudioGraph();
        const bass = graph.getBassEnergy();
        
        // Scale with bass
        const scale = 1 + (bass / 255);
        mesh.current.scale.set(scale, scale, scale);
        
        mesh.current.rotation.x += 0.01;
        mesh.current.rotation.y += 0.01;

        // Change shape on heavy transient (simulated beat detection)
        if (bass > 240 && Math.random() > 0.95) {
             setShapeIndex((prev) => (prev + 1) % 3);
        }
    });

    return (
        <group>
            {shapeIndex === 0 && <Box args={[3, 3, 3]} ref={mesh}><meshStandardMaterial wireframe color="#00ff9d" /></Box>}
            {shapeIndex === 1 && <Cylinder args={[2, 2, 4, 32]} ref={mesh}><meshStandardMaterial wireframe color="#bc13fe" /></Cylinder>}
            {shapeIndex === 2 && <Torus args={[2, 1, 16, 100]} ref={mesh}><meshStandardMaterial wireframe color="#00f2ff" /></Torus>}
        </group>
    )
}

/**
 * ENGINE 3: Monstercat Spectrum (Glass-like Bars with Glow)
 */
const MonstercatSpectrum = () => {
  const count = 64;
  const graph = getAudioGraph();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!meshRef.current) return;
    const data = graph.getFrequencyData();
    const minBin = 1;
    const maxBin = data.length - 1;

    for (let i = 0; i < count; i++) {
        // Logarithmic scale for x-axis distribution
        const binIndex = Math.floor(minBin * Math.pow(maxBin / minBin, i / count));
        const safeIndex = Math.min(data.length - 1, Math.max(0, binIndex));

        const value = data[safeIndex] / 255;
        
        // Spread bars wider
        dummy.position.set((i - count / 2) * 0.5, value * 5, 0);
        dummy.scale.set(1, 0.1 + value * 15, 1);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
        
        // Dynamic color could be set here via instanceColor buffer if we implemented it, 
        // sticking to material color for simplicity in this file.
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <Instances range={count} ref={meshRef}>
      <boxGeometry args={[0.3, 1, 0.3]} />
      {/* Glass-like material with glow */}
      <meshPhysicalMaterial 
        color="#ffffff" 
        emissive="#00f2ff"
        emissiveIntensity={0.8}
        roughness={0}
        metalness={0.1}
        transmission={0.6} // Glass effect
        thickness={1}
        transparent
        opacity={0.9}
      />
    </Instances>
  );
};

/**
 * ENGINE 5: Volumetric Bass Nebula
 */
const VolumetricNebula = () => {
    const points = useRef<THREE.Points>(null);
    const count = 2000;
    
    // Dense cloud
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for(let i=0; i<count; i++) {
            pos[i*3] = (Math.random() - 0.5) * 10;
            pos[i*3+1] = (Math.random() - 0.5) * 10;
            pos[i*3+2] = (Math.random() - 0.5) * 10;
        }
        return pos;
    }, []);

    useFrame((state) => {
        if(!points.current) return;
        const graph = getAudioGraph();
        const bass = graph.getBassEnergy() / 255; // 0 to 1
        
        // Expand strictly on bass
        const expansion = 1 + (bass * 2); 
        points.current.scale.set(expansion, expansion, expansion);
        points.current.rotation.y += 0.005;
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial 
                size={0.2} 
                color="#bc13fe" 
                transparent 
                opacity={0.6} 
                sizeAttenuation 
                blending={THREE.AdditiveBlending} 
            />
        </points>
    );
};

/**
 * ENGINE 4: Kinetic Topography Plane
 */
const KineticPlane = () => {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    const graph = getAudioGraph();
    const bass = graph.getBassEnergy() / 255;
    
    const geometry = mesh.current.geometry;
    const position = geometry.attributes.position;
    
    for (let i = 0; i < position.count; i++) {
        const x = position.getX(i);
        const y = position.getY(i);
        
        const dist = Math.sqrt(x * x + y * y);
        // Peak at kick transients (high bass)
        const z = Math.sin(dist * 1.5 - state.clock.elapsedTime * 3) * (bass * 3);
        
        position.setZ(i, z);
    }
    position.needsUpdate = true;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[20, 20, 32, 32]} />
      <meshStandardMaterial color="#2d3748" wireframe />
    </mesh>
  );
};

/**
 * ENGINE 2: Fractal Harmonic Ribbon
 */
const FractalRibbon = () => {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!mesh.current) return;
    const graph = getAudioGraph();
    const avg = graph.getAverageFrequency() / 255;
    mesh.current.rotation.x = state.clock.elapsedTime * 0.2;
    mesh.current.rotation.y = state.clock.elapsedTime * 0.3;
    mesh.current.scale.setScalar(1 + avg * 0.5);
  });
  return (
    <TorusKnot args={[3, 1, 128, 32]} ref={mesh}>
      <meshStandardMaterial color="#bc13fe" wireframe emissive="#bc13fe" emissiveIntensity={0.5} />
    </TorusKnot>
  );
};

/**
 * BACKGROUND: Aura/Nebula
 */
const AuraBackground = () => {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!mesh.current) return;
    const graph = getAudioGraph();
    const bass = graph.getBassEnergy();
    const s = 1 + (bass / 512);
    mesh.current.scale.set(s, s, s);
    mesh.current.rotation.z -= 0.001;
  });

  return (
    <mesh ref={mesh} position={[0, 0, -5]}>
      <planeGeometry args={[30, 30, 32, 32]} />
      <meshBasicMaterial 
        color="#1a202c" 
        wireframe 
        transparent 
        opacity={0.1} 
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
};

const Visualizer3D: React.FC<Visualizer3DProps> = ({ mode }) => {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 12], fov: 45 }}>
        <color attach="background" args={['#050505']} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <AuraBackground />
        
        <group>
            {mode === 'PARTICLE_SPHERE' && <ParticleSphere />}
            {mode === 'FRACTAL_RIBBON' && <FractalRibbon />}
            {mode === 'MONSTERCAT' && <MonstercatSpectrum />}
            {mode === 'NEBULA' && <VolumetricNebula />}
            {mode === 'KINETIC_PLANE' && <KineticPlane />}
            {mode === 'GEOMETRY_MORPH' && <GeometryMorph />} 
        </group>

        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
    </div>
  );
};

export default Visualizer3D;
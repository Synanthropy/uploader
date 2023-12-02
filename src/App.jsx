import { useEffect, useRef, useState } from 'react'
import './App.css'
import axios from 'axios';
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { render } from 'react-dom'

function App() {
  const canvasRef = useRef()
  const currentFileRef = useRef()
  const [thumbnailData, setThumbnailData] = useState(null);
  const thumbnailDataRef = useRef()

  const formSubmissionEvent = new CustomEvent('form-submission-success', {detail: true})

  let camera, light, scene, renderer;
  let platform;
  useEffect(() => {
    console.log('scene');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb)

    camera = new THREE.PerspectiveCamera(75, 550 / 550, 0.1, 100 )
    camera.position.set(1 , 2, 4.5);
    
    renderer = new THREE.WebGLRenderer({antialias : true, preserveDrawingBuffer: true});
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(550, 550)
    canvasRef.current.appendChild(renderer.domElement)

    light = new THREE.DirectionalLight(0xffffff, 3);
    light.shadow.camera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.5, 500);
    light.castShadow = true;
    light.position.set(0, 55, 35);
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;
    light.shadow.camera.near = .05;
    light.shadow.camera.far = 500;
    light.shadow.bias = -0.0001;
    scene.add(light)
    
    const orbitControls = new OrbitControls(camera, renderer.domElement)
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.5;
    orbitControls.screenSpacePanning = false;
    orbitControls.minDistance = 0.01;
    orbitControls.maxDistance = 150;
    orbitControls.maxPolarAngle = Math.PI / 2.21;

    const platformGeo = new THREE.PlaneGeometry(100,100,)
    const platMaterial = new THREE.MeshLambertMaterial( {color : 0x5c7668})
    platform = new THREE.Mesh(platformGeo,platMaterial)
    platform.rotation.x = -Math.PI /2
    scene.add(platform)
    
    const form = document.getElementById('item-form')
    form.addEventListener('submit', function (event) {
      event.preventDefault()
      console.log(event);
      console.log('current file',currentFileRef.current);
      handleUpload(event, currentFileRef.current)
    } )
    
    animate()
    return () => {
      renderer.dispose()
      form.removeEventListener('submit', function (event) {
        event.preventDefault()
        console.log(event);
        console.log('current file',currentFileRef.current);
        handleUpload(event, currentFileRef.current)
      } )
    }  
  }, [])
  
  const animate = () => {
    requestAnimationFrame(animate);
    handleRender()
  }
  const handleRender = () => {
    renderer.render(scene, camera)
  }
  
  const handleFiles = async (event) => {
    const files = event.target.files;
    const form = document.getElementById('item-form')
    
    
    for (let file of files){
      form.children[1].children[1].value = file.name;
      const model = await handleLoader(file)
      scene.add(model)
      currentFileRef.current = file
      const event = await waitForEvent('form-submission-success')
      scene.remove(model)
    }
  }

  const waitForEvent= (eventName) =>{
    return new Promise(resolve => {
      window.addEventListener(eventName, function eventHandler(event) { 
        window.removeEventListener(eventName, eventHandler);
        resolve(event)
      })
    })
  }

  const handleLoader = (file) => {
    const url = URL.createObjectURL(file)
    const loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
        loader.load (url, function (itemModel) {
            const model = itemModel.scene
            console.log(model);
            resolve(model)
        }, 
        undefined, // for loading in progress
        function (error) { //for loading failure
            reject(error);
        }
        )
    })
  }

  const handleCaptureImg = () => {
    console.log('capturing scene');
    if (canvasRef.current) {
      const thumbnail = canvasRef.current.firstChild
      const base64 = thumbnail.toDataURL('image/png')
      document.getElementById('thumbnail-preview').src = base64
      
      const dataBlob = imgToBlob(base64, 'image/png')
      console.log('datablob', dataBlob);
      setThumbnailData(dataBlob)
      thumbnailDataRef.current = dataBlob
    }
  }

  const imgToBlob = (base64, mimeType) => {
    const byteString = atob(base64.split(',')[1])
    const arrayBuffer = new ArrayBuffer(byteString.length)
    const int8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      int8Array[i] = byteString.charCodeAt(i)
    }
    return new Blob([int8Array], {type: mimeType, })
  }

  const handleUpload = async (event) => {
      const formData = new FormData(); 
      const item_name = event.target[0].value;
      const filename = event.target[1].value;
      const category = document.getElementById('item_type').value
      
      formData.append('item_name', item_name);
      formData.append('filename', filename);
      formData.append('category', category);
      console.log(currentFileRef.current.name.split('.glb')[0]);
      formData.append('thumbnail', thumbnailDataRef.current, currentFileRef.current.name.split('.glb')[0])
      formData.append('model', currentFileRef.current)
      
      try {
        const response = await axios.post('https://localhost:41798/ims-uploader', formData)
        if (response.status === 200) {
          console.log('success');
          window.dispatchEvent(formSubmissionEvent)
        }else{
          console.log('rejected 1');
          
        }
      } catch (error) {
        console.log('rejected 2');
      }
      
    }
  
    
  return (
    <>
      <div className='canvas'>
        <div ref={canvasRef} id='three-scene'></div>
      </div> 
      
      <div className='col'>
        <button type='button' className='button' onClick={handleCaptureImg}>Capture Scene</button>
        <h2>Thumbnail Preview</h2>
        <img className='preview' id='thumbnail-preview' src='' alt="Model Display Image" />
      </div>

    
      <div>
        <h2>Select 3d Files</h2>
        <input type='file' id='uploadFiles' name='uploadFiles' accept='.gltf,.glb' multiple onChange={(e) => handleFiles(e)}/>
      </div> 
      
        <form id='item-form' className='col'>
          <div className='form-detail'>
            <label htmlFor="item_name">Item Name</label>
            <input type="text" placeholder='item_name' name='item_name' id='item_name' required/>
          </div>
          <div className='form-detail'>
            <label htmlFor="filename">Filename</label>
            <input type="text" placeholder='filename' name='filename' id='filename' required/>
          </div>
          <div className='form-detail'>
            <label htmlFor="item_type">Category</label>
            <select id='item_type' name='item_type'>
              <option value="bedding">bedding</option>
              <option value="electronics">electronics</option>
              <option value="environment">environment</option>
              <option value="lights">lights</option>
              <option value="seating">seating</option>
              <option value="sofas">sofas</option>
              <option value="storage">storage</option>
              <option value="table">table</option>
            </select>
          </div>

          <button type='submit' className='button'>Upload Model</button>
        </form>
    </>
  )
}

export default App

import {
  ArcRotateCamera,
  BoundingInfo,
  Camera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  GlowLayer,
  HemisphericLight,
  Mesh,
  PBRMaterial,
  Scene,
  SceneLoader,
  SpotLight,
  Vector3,
} from '@babylonjs/core'
import '@babylonjs/loaders'
import { GLTFFileLoader } from '@babylonjs/loaders'
import { WearableCategory } from '@dcl/schemas'
import future from 'fp-future'

function refreshBoundingInfo(parent: Mesh) {
  const children = parent.getChildren().filter((mesh) => mesh.id !== '__root__')
  if (children.length > 0) {
    const child = children[0] as Mesh
    // child.showBoundingBox = true
    let boundingInfo = child.getBoundingInfo()

    let min = boundingInfo.boundingBox.minimumWorld.add(child.position)
    let max = boundingInfo.boundingBox.maximumWorld.add(child.position)

    for (let i = 1; i < children.length; i++) {
      const child = children[i] as Mesh
      // child.showBoundingBox = true
      boundingInfo = child.getBoundingInfo()
      const siblingMin = boundingInfo.boundingBox.minimumWorld.add(child.position)
      const siblingMax = boundingInfo.boundingBox.maximumWorld.add(child.position)

      min = Vector3.Minimize(min, siblingMin)
      max = Vector3.Maximize(max, siblingMax)
    }

    parent.setBoundingInfo(new BoundingInfo(min, max))
  }
}

export async function loadWearable(
  canvas: HTMLCanvasElement,
  url: string,
  mappings: Record<string, string>,
  options: { category: WearableCategory; skin?: string; hair?: string }
) {
  // Create engine
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  })

  // Load GLB/GLTF
  const root = new Scene(engine)
  root.autoClear = true
  root.clearColor = new Color4(0, 0, 0, 0)
  root.preventDefaultOnPointerDown = false
  SceneLoader.OnPluginActivatedObservable.addOnce((plugin) => {
    if (plugin.name === 'gltf') {
      const gltf = plugin as GLTFFileLoader
      gltf.preprocessUrlAsync = async (url: string) => {
        const baseUrl = `/content/contents/`
        const parts = url.split(baseUrl)
        return parts.length > 0 && !!parts[1] ? mappings[parts[1]] : url
      }
    }
  })
  const sceneFuture = future<Scene>()
  const loadScene = async (extension: string) => SceneLoader.AppendAsync(url, '', root, null, extension)
  const getLoader = async () => {
    // try with GLB, if it fails try with GLTF
    try {
      return await loadScene('.glb')
    } catch (error) {
      return await loadScene('.gltf')
    }
  }
  const loader = await getLoader()
  loader.onReadyObservable.addOnce((scene) => sceneFuture.resolve(scene))
  const scene = await sceneFuture

  // effects
  var glow = new GlowLayer('glow', scene, {
    mainTextureFixedSize: 1024,
    blurKernelSize: 64,
  })
  glow.intensity = 1

  // Setup Camera
  var camera = new ArcRotateCamera('camera', 0, 0, 0, new Vector3(0, 0, 0), scene)
  camera.mode = Camera.PERSPECTIVE_CAMERA
  camera.position = new Vector3(-2, 2, 2)
  camera.useAutoRotationBehavior = true
  camera.autoRotationBehavior!.idleRotationSpeed = 0.2
  camera.setTarget(Vector3.Zero())
  camera.lowerRadiusLimit = camera.upperRadiusLimit = camera.radius / (options.category === WearableCategory.UPPER_BODY ? 2 : 1.25) // upper body has extra zoom
  camera.attachControl(canvas, true)

  // Setup lights
  var directional = new DirectionalLight('directional', new Vector3(0, 0, 1), scene)
  directional.intensity = 1
  var top = new HemisphericLight('top', new Vector3(0, -1, 0), scene)
  top.intensity = 1
  var bottom = new HemisphericLight('bottom', new Vector3(0, 1, 0), scene)
  bottom.intensity = 1
  var spot = new SpotLight('spot', new Vector3(-2, 2, 2), new Vector3(2, -2, -2), Math.PI / 2, 1000, scene)
  spot.intensity = 1

  // Setup parent
  var parent = new Mesh('parent', scene)
  for (const mesh of scene.meshes) {
    if (mesh !== parent) {
      mesh.setParent(parent)
    }
  }

  // Clean up
  for (let material of scene.materials) {
    if (material.name.toLowerCase().includes('hair_mat')) {
      if (options.hair) {
        const pbr = material as PBRMaterial
        pbr.albedoColor = Color3.FromHexString(options.hair)
      } else {
        material.alpha = 0
        scene.removeMaterial(material)
      }
    }
    if (material.name.toLowerCase().includes('avatarskin_mat')) {
      if (options.skin) {
        const pbr = material as PBRMaterial
        pbr.albedoColor = Color3.FromHexString(options.skin)
      } else {
        material.alpha = 0
        scene.removeMaterial(material)
      }
    }
  }

  // resize and center
  refreshBoundingInfo(parent)
  const bounds = parent.getBoundingInfo().boundingBox.extendSize
  const size = bounds.length()
  const scale = new Vector3(1 / size, 1 / size, 1 / size)
  parent.scaling = scale
  const center = parent.getBoundingInfo().boundingBox.center.multiply(scale)
  parent.position.subtractInPlace(center)

  // render loop
  engine.runRenderLoop(() => scene.render())
}

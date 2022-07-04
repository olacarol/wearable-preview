import { AnimationGroup, ArcRotateCamera, AssetContainer, Scene, TransformNode } from '@babylonjs/core'
import { IEmoteController, PreviewCamera, PreviewConfig, PreviewEmote, WearableDefinition } from '@dcl/schemas'
import { isEmote } from '../emote'
import { getRepresentation } from '../representation'
import { startAutoRotateBehavior } from './camera'
import { Asset, loadAssetContainer } from './scene'

const loopedEmotes = [PreviewEmote.IDLE, PreviewEmote.MONEY, PreviewEmote.CLAP]

function isLooped(emote: PreviewEmote) {
  return loopedEmotes.includes(emote)
}

export function buildEmoteUrl(emote: PreviewEmote) {
  let baseUrl = process.env.PUBLIC_URL || ''
  if (!baseUrl.endsWith('/')) {
    baseUrl += '/'
  }
  const path = `./emotes/${emote}.glb`
  const url = baseUrl.startsWith('http') ? new URL(path, baseUrl).href : path
  return url
}

export async function loadEmoteFromUrl(scene: Scene, url: string) {
  const container = await loadAssetContainer(scene, url)
  if (container.animationGroups.length === 0) {
    throw new Error(`No animation groups found for emote with url=${url}`)
  }
  return container
}

export async function loadEmoteFromWearable(scene: Scene, wearable: WearableDefinition, config: PreviewConfig) {
  const representation = getRepresentation(wearable, config.bodyShape)
  const content = representation.contents.find((content) => content.key === representation.mainFile)
  if (!content) {
    throw new Error(
      `Could not find a valid content in representation for wearable=${wearable.id} and bodyShape=${config.bodyShape}`
    )
  }
  return loadEmoteFromUrl(scene, content.url)
}

export async function playEmote(scene: Scene, assets: Asset[], config: PreviewConfig) {
  // load asset container for emote
  let container: AssetContainer | undefined
  let loop = isLooped(config.emote)
  // if target wearable is emote, play that one
  if (config.wearable && isEmote(config.wearable)) {
    try {
      container = await loadEmoteFromWearable(scene, config.wearable, config)
      loop = !!config.wearable.emoteDataV0?.loop
    } catch (error) {
      console.warn(`Could not load emote=${config.wearable.id}`)
    }
  } else if (config.wearables.some(isEmote)) {
    // if there's some emote in the wearables list, play the last one
    const emote = config.wearables.reverse().find(isEmote)!
    container = await loadEmoteFromWearable(scene, emote, config)
    loop = !!emote.emoteDataV0?.loop
  }
  if (!container) {
    const emoteUrl = buildEmoteUrl(config.emote)
    container = await loadEmoteFromUrl(scene, emoteUrl)
  }

  const emoteAnimationGroup = new AnimationGroup('emote', scene)

  // start camera rotation after animation ends
  function onAnimationEnd() {
    if (config.camera !== PreviewCamera.STATIC) {
      const camera = scene.cameras[0] as ArcRotateCamera
      startAutoRotateBehavior(camera, config)
    }
    if (loop) {
      emoteAnimationGroup.play(true) // keep playing animation in loop
    }
  }

  // play emote animation
  try {
    for (const asset of assets) {
      // store all the transform nodes in a map, there can be repeated node ids
      // if a wearable has multiple representations, so for each id we keep an array of nodes
      const nodes = asset.container.transformNodes.reduce((map, node) => {
        const list = map.get(node.id) || []
        list.push(node)
        return map.set(node.id, list)
      }, new Map<string, TransformNode[]>())
      // apply each targeted animation from the emote asset container to the transform nodes of all the wearables
      if (container.animationGroups.length > 0) {
        for (const targetedAnimation of container.animationGroups[0].targetedAnimations) {
          const animation = targetedAnimation.animation
          const target = targetedAnimation.target as TransformNode
          const newTargets = nodes.get(target.id)
          if (newTargets && newTargets.length > 0) {
            for (const newTarget of newTargets) {
              emoteAnimationGroup.addTargetedAnimation(animation, newTarget)
            }
          }
        }
      } else {
        throw new Error(`No animationGroups found`)
      }
    }
    // play animation group and apply
    emoteAnimationGroup.onAnimationGroupEndObservable.addOnce(onAnimationEnd)
    const controller = createController(emoteAnimationGroup, loop)

    if (config.camera === PreviewCamera.STATIC) {
      controller.stop() // we call the stop here to freeze the animation at frame 0, otherwise the avatar would be on T-pose
    } else {
      controller.play()
    }

    return controller
  } catch (error) {
    console.warn(`Could not play emote=${config.emote}`, error)
  }
}

function createController(animationGroup: AnimationGroup, loop: boolean): IEmoteController {
  let startFrom = 0
  let hasPlayed = false

  function getLength() {
    return animationGroup.to
  }

  function isPlaying() {
    return animationGroup.isPlaying
  }

  function goTo(seconds: number) {
    if (isPlaying()) {
      animationGroup.pause()
      goTo(seconds)
      window.requestAnimationFrame(play)
    } else {
      // for some reason the start() method doesn't work as expected if playing, so I need to stop it first
      animationGroup.stop()
      // I had to use this hack because the native goToFrame would not work as expected :/
      animationGroup.start(false, 1, seconds, seconds, false)
      startFrom = seconds
    }
  }

  function play() {
    if (!isPlaying()) {
      if (startFrom) {
        animationGroup.start(loop, 1, startFrom, getLength(), false)
        startFrom = 0
      } else {
        animationGroup.play(loop)
      }
      hasPlayed = true
    }
  }

  function pause() {
    if (isPlaying()) {
      animationGroup.pause()
    }
  }

  function stop() {
    if (hasPlayed) {
      goTo(0)
      window.requestAnimationFrame(pause)
    } else {
      play()
      window.requestAnimationFrame(stop)
    }
  }

  return {
    getLength,
    isPlaying,
    goTo,
    play,
    pause,
    stop,
  }
}

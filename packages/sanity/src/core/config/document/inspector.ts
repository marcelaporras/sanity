import {ValidationMarker} from '@sanity/types'
import {ButtonTone} from '@sanity/ui'
import {ComponentType} from 'react'

/** @beta */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DocumentInspectorProps {
  onClose: () => void
}

/** @beta */
export type DocumentInspectorComponent = ComponentType<DocumentInspectorProps>

/** @beta */
export interface DocumentInspectorCallbackContext {
  validation: ValidationMarker[]
}

/** @beta */
export interface DocumentInspectorMenuItem {
  hidden?: boolean | ((props: DocumentInspectorCallbackContext) => boolean)
  hotkeys?: string[]
  icon?: ComponentType
  title: string
  tone?: ButtonTone
}

/** @beta */
export interface DocumentInspector {
  name: string
  component: DocumentInspectorComponent
  showAsAction?: boolean
  menuItem?:
    | DocumentInspectorMenuItem
    | ((props: DocumentInspectorCallbackContext) => DocumentInspectorMenuItem)

  /**
   * Callback for when the inspector is closed, which can be used to clean up custom document pane
   * parameters.
   */
  onClose?: (ctx: {params: Record<string, string | undefined>}) => {
    params: Record<string, string | undefined>
  }

  /**
   * Callback for when the inspector is opened, which can be used to set custom document pane
   * parameters.
   */
  onOpen?: (ctx: {params: Record<string, string | undefined>}) => {
    params: Record<string, string | undefined>
  }
}

/**
 * Define a document inspector to be used in Sanity configuration.
 *
 * @example
 *
 * ```ts
 * // sanity.config.ts
 *
 * import {RocketIcon} from '@sanity/icons'
 * import {defineConfig, defineDocumentInspector} from 'sanity'
 *
 * const customInspector = defineDocumentInspector({
 *   name: 'custom',
 *   menuItem: {
 *     icon: RocketIcon,
 *     title: 'Custom',
 *   },
 *   component: lazy(() => import('./inspectors/custom')),
 *   showAsAction: true,
 * })
 *
 * export default defineConfig({
 *   // ...
 *
 *   document: {
 *     inspectors: (prev) => [customInspector, ...prev],
 *   },
 * })
 * ```
 *
 * @internal
 * */
export function defineDocumentInspector(inspector: DocumentInspector): DocumentInspector {
  return inspector
}

/* eslint-disable complexity, max-nested-callbacks, no-nested-ternary */
import {ResetIcon as ClearIcon, SyncIcon as ReplaceIcon} from '@sanity/icons'
import {type CrossDatasetReferenceSchemaType, type CrossDatasetReferenceValue} from '@sanity/types'
import {Box, Card, Flex, Inline, Menu, Stack, useToast} from '@sanity/ui'
import {FOCUS_TERMINATOR} from '@sanity/util/paths'
import {
  type FocusEvent,
  type KeyboardEvent,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import {useObservableCallback} from 'react-rx'
import {concat, type Observable, of} from 'rxjs'
import {catchError, distinctUntilChanged, filter, map, scan, switchMap, tap} from 'rxjs/operators'

import {MenuButton, MenuItem} from '../../../../ui-components'
import {ChangeIndicator} from '../../../changeIndicators/ChangeIndicator'
import {PreviewCard} from '../../../components'
import {ContextMenuButton} from '../../../components/contextMenuButton'
import {type FIXME} from '../../../FIXME'
import {useFeatureEnabled} from '../../../hooks/useFeatureEnabled'
import {useTranslation} from '../../../i18n'
import {getPublishedId, isNonNullable} from '../../../util'
import {useDidUpdate} from '../../hooks/useDidUpdate'
import {useOnClickOutside} from '../../hooks/useOnClickOutside'
import {set, unset} from '../../patch'
import {type ObjectInputProps} from '../../types'
import {ReferenceMetadataLoadErrorAlertStrip} from '../ReferenceInput/ReferenceMetadataLoadFailure'
import {ReferenceStrengthMismatchAlertStrip} from '../ReferenceInput/ReferenceStrengthMismatchAlertStrip'
import {DisabledFeatureWarning} from './DisabledFeatureWarning'
import {OptionPreview} from './OptionPreview'
import {PreviewReferenceValue} from './PreviewReferenceValue'
import {ReferenceAutocomplete} from './ReferenceAutocomplete'
import {type CrossDatasetReferenceInfo, type CrossDatasetSearchHit, type SearchState} from './types'
import {type GetReferenceInfoFn, useReferenceInfo} from './useReferenceInfo'
import {useProjectId} from './utils/useProjectId'

const INITIAL_SEARCH_STATE: SearchState = {
  hits: [],
  isLoading: false,
}

/** @internal */
export interface CrossDatasetReferenceInputProps
  extends ObjectInputProps<CrossDatasetReferenceValue, CrossDatasetReferenceSchemaType> {
  getReferenceInfo: (
    doc: {_id: string; _type?: string},
    type: CrossDatasetReferenceSchemaType,
  ) => Observable<CrossDatasetReferenceInfo>
  onSearch: (query: string) => Observable<CrossDatasetSearchHit[]>
}

const NO_FILTER = () => true

const REF_PATH = ['_ref']
const CROSS_DATASET_FEATUREKEY = 'crossDatasetReferences'

/** @internal */
export function CrossDatasetReferenceInput(props: CrossDatasetReferenceInputProps) {
  const {
    changed,
    focused,
    focusPath,
    getReferenceInfo,
    onChange,
    onPathFocus,
    onSearch,
    path,
    readOnly,
    schemaType,
    validation,
    value,
    elementProps,
  } = props

  const {t} = useTranslation()
  const projectId = useProjectId()

  const [searchState, setSearchState] = useState<SearchState>(INITIAL_SEARCH_STATE)

  const handleChange = useCallback(
    (id: string) => {
      if (!id) {
        onChange(unset())
        onPathFocus([])
        return
      }

      const hit = searchState.hits.find((h) => h.id === id)

      if (!hit) {
        throw new Error('Selected an item that wasnt part of the result set')
      }

      onChange(
        set({
          _type: schemaType.name,
          _ref: getPublishedId(id),
          _projectId: projectId,
          _dataset: schemaType.dataset,
          _weak: schemaType.weak,
          // persist _key between mutations if the value is in an array
          _key: value?._key,
        }),
      )

      onPathFocus([])
    },
    [
      value?._key,
      searchState.hits,
      schemaType.name,
      schemaType.dataset,
      schemaType.weak,
      projectId,
      onChange,
      onPathFocus,
    ],
  )

  const handleClear = useCallback(() => {
    onChange(unset())
  }, [onChange])

  const handleAutocompleteKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        onPathFocus?.([])
      }
    },
    [onPathFocus],
  )

  const getReferenceInfoMemo: GetReferenceInfoFn = useCallback(
    (doc) => getReferenceInfo(doc, schemaType),
    [getReferenceInfo, schemaType],
  )

  const refDoc = useMemo(() => ({_id: value?._ref}), [value?._ref])

  const loadableReferenceInfo = useReferenceInfo(refDoc as FIXME, getReferenceInfoMemo)
  const featureInfo = useFeatureEnabled(CROSS_DATASET_FEATUREKEY)

  const autocompletePopoverReferenceElementRef = useRef<HTMLDivElement | null>(null)

  const hasFocusAtRef = focusPath.length === 1 && focusPath[0] === '_ref'

  // --- focus handling
  const focusElementRef = elementProps.ref
  useDidUpdate({hasFocusAt: hasFocusAtRef, ref: value?._ref}, (prev, current) => {
    const refUpdated = prev?.ref !== current.ref
    const focusAtUpdated = prev?.hasFocusAt !== current.hasFocusAt

    if ((focusAtUpdated || refUpdated) && current.hasFocusAt) {
      // if search mode changed and we're having focus always ensure the
      // ref element gets focus
      focusElementRef.current?.focus()
    }
  })

  const actualStrength = value?._weak ? 'weak' : 'strong'
  const weakShouldBe = schemaType.weak === true ? 'weak' : 'strong'

  const hasRef = Boolean(value?._ref)

  const handleFixStrengthMismatch = useCallback(() => {
    onChange(schemaType.weak === true ? set(true, ['_weak']) : unset(['_weak']))
  }, [onChange, schemaType])

  const {push} = useToast()

  const errors = useMemo(() => validation.filter((item) => item.level === 'error'), [validation])

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      if (event.currentTarget === elementProps.ref.current) {
        onPathFocus?.([FOCUS_TERMINATOR])
      }
    },
    [elementProps.ref, onPathFocus],
  )

  const handleAutocompleteFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (event.currentTarget === elementProps.ref.current) {
        onPathFocus?.(REF_PATH)
      }
    },
    [elementProps.ref, onPathFocus],
  )
  const handleReplace = useCallback(() => {
    onPathFocus?.(REF_PATH)
  }, [onPathFocus])

  const inputId = useId()

  const handleQueryChange = useObservableCallback(
    (inputValue$: Observable<string | null>) => {
      return inputValue$.pipe(
        filter(isNonNullable),
        distinctUntilChanged(),
        switchMap((searchString) =>
          concat(
            of({isLoading: true}),
            onSearch(searchString).pipe(
              map((hits) => ({hits, searchString, isLoading: false})),
              catchError((error) => {
                push({
                  title: 'Reference search failed',
                  description: error.message,
                  status: 'error',
                  id: `reference-search-fail-${inputId}`,
                })

                console.error(error)
                return of({hits: []})
              }),
            ),
          ),
        ),

        scan(
          (prevState, nextState): SearchState => ({...prevState, ...nextState}),
          INITIAL_SEARCH_STATE,
        ),

        tap(setSearchState),
      )
    },
    [inputId, onSearch, push],
  )

  const handleAutocompleteOpenButtonClick = useCallback(() => {
    handleQueryChange('')
  }, [handleQueryChange])

  const showWeakRefMismatch =
    !loadableReferenceInfo.isLoading && hasRef && actualStrength !== weakShouldBe

  const studioUrl =
    (value?._ref &&
      schemaType.studioUrl?.({
        id: value?._ref,
        type: loadableReferenceInfo?.result?.type,
      })) ||
    null

  const renderOption = useCallback(
    (option: FIXME) => {
      return (
        <PreviewCard as="button" type="button" radius={2}>
          <Box paddingX={3} paddingY={1}>
            <OptionPreview
              referenceType={schemaType}
              document={option.hit.published}
              getReferenceInfo={getReferenceInfoMemo}
            />
          </Box>
        </PreviewCard>
      )
    },
    [schemaType, getReferenceInfoMemo],
  )

  const isEditing = hasFocusAtRef || !value?._ref

  // --- click outside handling
  const clickOutsideBoundaryRef = useRef<HTMLDivElement | null>(null)
  const autocompletePortalRef = useRef<HTMLDivElement | null>(null)
  const createButtonMenuPortalRef = useRef<HTMLDivElement | null>(null)
  useOnClickOutside(
    [clickOutsideBoundaryRef, autocompletePortalRef, createButtonMenuPortalRef],
    () => {
      if (hasFocusAtRef) {
        onPathFocus([])
      }
    },
  )

  return (
    <>
      {!featureInfo.isLoading && !featureInfo.enabled && (
        <DisabledFeatureWarning value={value} onClearValue={handleClear} />
      )}
      {(featureInfo.isLoading || featureInfo.enabled) && (
        <Stack space={1}>
          {isEditing ? (
            <Stack space={2} ref={clickOutsideBoundaryRef}>
              <ChangeIndicator path={path} isChanged={changed} hasFocus={!!focused}>
                <div ref={autocompletePopoverReferenceElementRef}>
                  <ReferenceAutocomplete
                    {...elementProps}
                    data-testid="autocomplete"
                    loading={searchState.isLoading}
                    referenceElement={autocompletePopoverReferenceElementRef.current}
                    portalRef={autocompletePortalRef}
                    id={inputId || ''}
                    options={searchState.hits.map((hit) => ({
                      value: hit.id,
                      hit: hit,
                    }))}
                    onFocus={handleAutocompleteFocus}
                    radius={2}
                    placeholder={t('inputs.reference.search-placeholder')}
                    onKeyDown={handleAutocompleteKeyDown}
                    readOnly={readOnly}
                    disabled={loadableReferenceInfo.isLoading}
                    onQueryChange={handleQueryChange}
                    searchString={searchState.searchString}
                    onChange={handleChange}
                    filterOption={NO_FILTER}
                    renderOption={renderOption}
                    openButton={{onClick: handleAutocompleteOpenButtonClick}}
                  />
                </div>
              </ChangeIndicator>
            </Stack>
          ) : (
            <ChangeIndicator path={path} isChanged={changed} hasFocus={!!focused}>
              <Card
                padding={0}
                border
                flex={1}
                radius={1}
                tone={
                  readOnly
                    ? 'transparent'
                    : loadableReferenceInfo.error || errors.length > 0
                      ? 'critical'
                      : 'default'
                }
              >
                <Flex align="center" padding={1}>
                  {studioUrl ? (
                    <PreviewCard
                      as="a"
                      target="_blank"
                      rel="noopener noreferrer"
                      href={studioUrl}
                      data-as="a"
                      flex={1}
                      padding={1}
                      paddingRight={3}
                      radius={2}
                      tone="inherit"
                      __unstable_focusRing
                      tabIndex={0}
                      onFocus={handleFocus}
                      ref={elementProps.ref}
                    >
                      <PreviewReferenceValue
                        value={value}
                        referenceInfo={loadableReferenceInfo}
                        showStudioUrlIcon
                        hasStudioUrl={!!studioUrl}
                        type={schemaType}
                      />
                    </PreviewCard>
                  ) : (
                    <PreviewCard
                      flex={1}
                      padding={1}
                      paddingRight={3}
                      radius={2}
                      tone="inherit"
                      __unstable_focusRing
                      tabIndex={0}
                      onFocus={handleFocus}
                      ref={elementProps.ref}
                    >
                      <PreviewReferenceValue
                        value={value}
                        referenceInfo={loadableReferenceInfo}
                        showStudioUrlIcon
                        type={schemaType}
                      />
                    </PreviewCard>
                  )}

                  <Inline paddingX={1}>
                    <MenuButton
                      button={<ContextMenuButton data-testid="menu-button" />}
                      id={`${inputId}-menuButton`}
                      menu={
                        <Menu>
                          {!readOnly && (
                            <>
                              <MenuItem
                                text={t('inputs.reference.action.clear')}
                                tone="critical"
                                icon={ClearIcon}
                                data-testid="menu-item-clear"
                                onClick={handleClear}
                              />

                              <MenuItem
                                text={t('inputs.reference.action.replace')}
                                icon={ReplaceIcon}
                                data-testid="menu-item-replace"
                                onClick={handleReplace}
                              />
                            </>
                          )}
                        </Menu>
                      }
                      placement="right"
                      popover={{portal: true, tone: 'default'}}
                    />
                  </Inline>
                </Flex>
                {showWeakRefMismatch && (
                  <ReferenceStrengthMismatchAlertStrip
                    actualStrength={actualStrength}
                    handleFixStrengthMismatch={handleFixStrengthMismatch}
                  />
                )}

                {loadableReferenceInfo.error && (
                  <ReferenceMetadataLoadErrorAlertStrip
                    errorMessage={loadableReferenceInfo.error.message}
                    onHandleRetry={loadableReferenceInfo.retry!}
                  />
                )}
              </Card>
            </ChangeIndicator>
          )}
        </Stack>
      )}
    </>
  )
}

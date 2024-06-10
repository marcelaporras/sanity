import {Box, Button, useToast} from '@sanity/ui'
import {isEqual} from 'lodash'
import {type ReactNode, useEffect, useState} from 'react'

import {useTranslation} from '../../i18n'
import {checkForLatestVersions} from './checkForLatestVersions'

/*
 * We are currently only checking to see if the sanity module has a new version available.
 * We can add more packages to this list (e.g., @sanity/vision) if we want to check for more.
 */
const currentPackages = {
  // sanity: SANITY_VERSION,
  sanity: '3.40.0',
}

export function PackageVersionStatusProvider({children}: {children: ReactNode}) {
  const [hasNewVersion, setHasNewVersion] = useState<boolean>(false)
  const toast = useToast()
  const {t} = useTranslation()

  // const autoUpdatingPackages = hasSanityPackageInImportMap()
  const autoUpdatingPackages = true

  const onClick = () => {
    window.location.reload()
  }

  useEffect(() => {
    const sub = checkForLatestVersions(currentPackages).subscribe({
      next: (latestVersions) => {
        /*
         * As we get more sophisticated, this implementation
         * should likely check for ranges, semver resolution, etc.
         */
        setHasNewVersion(!isEqual(latestVersions, currentPackages))
      },
    })
    return () => sub?.unsubscribe()
  }, [setHasNewVersion, autoUpdatingPackages])

  useEffect(() => {
    if (hasNewVersion) {
      toast.push({
        title: t('package-version.new-package-available.title'),
        description: (
          <Box>
            <Box>{t('package-version.new-package-available.description')}</Box>
            <Button
              onClick={onClick}
              paddingX={1}
              paddingY={2}
              aria-label={t('package-version.new-package-available.reload-button')}
              mode={'bleed'}
            >
              {t('package-version.new-package-available.reload-button')}
            </Button>
          </Box>
        ),
        closable: true,
        duration: 10000,
        status: 'info',
      })
    }
  }, [hasNewVersion, toast, t])

  return <>{children}</>
}

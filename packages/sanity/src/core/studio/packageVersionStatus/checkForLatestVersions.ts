import {from, map, type Observable, ReplaySubject, timer} from 'rxjs'
import {share, switchMap} from 'rxjs/operators'

//object like {sanity: '3.40.1'}
interface VersionMap {
  [key: string]: string | null
}

// How often to check for a version
// const REFRESH_INTERVAL = 1000 * 60 * 30 // every half hour
const REFRESH_INTERVAL = 1000 * 5

//reset the observable when it completes or when it has no refcount
const RESET_TIMER = timer(REFRESH_INTERVAL)

const MODULES_URL_VERSION = 'v1'

const MODULES_URL = `https://sanity-cdn.work/${MODULES_URL_VERSION}/modules/`

const fetchLatestVersionForPackage = async (pkg: string, version: string) => {
  try {
    const res = await fetch(`${MODULES_URL}${pkg}/default/^${version}`, {
      method: 'HEAD',
    })
    // console.log(res.headers.get('cache-control'), res.headers.get('x-resolved-version'))
    return res.headers.get('x-resolved-version')
  } catch {
    console.error('Failed to fetch latest version for package', pkg)
    return null
  }
}

export const checkForLatestVersions = (
  packages: Record<string, string>,
): Observable<VersionMap> => {
  const packageNames = Object.keys(packages)
  return timer(0, REFRESH_INTERVAL).pipe(
    switchMap(() =>
      from(
        Promise.all(packageNames.map((pkg) => fetchLatestVersionForPackage(pkg, packages[pkg]))),
      ).pipe(
        map((results) => {
          const packageVersions: VersionMap = {}
          packageNames.forEach((pkg, index) => {
            packageVersions[pkg] = results[index]
          })
          return packageVersions
        }),
      ),
    ),
    share({
      connector: () => new ReplaySubject(1),
      resetOnComplete: () => RESET_TIMER,
      resetOnRefCountZero: () => RESET_TIMER,
    }),
  )
}

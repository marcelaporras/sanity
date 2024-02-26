import {type SanityClient} from '@sanity/client'
import {type SearchStrategy} from '@sanity/types'
import {type Observable} from 'rxjs'

import {createHybridSearch} from './hybrid'
import {createTextSearch} from './text-search'
import {createWeightedSearch} from './weighted'
import {
  type SearchableType,
  type SearchHit,
  type SearchOptions,
  type SearchTerms,
  type WeightedHit,
  type WeightedSearchOptions,
} from './weighted/types'

interface SearchHitsPage {
  hits: SearchHit[]
  pageIncrement: () => Observable<SearchHitsPage>
}

type SearchStrategyFactory = (
  types: SearchableType[],
  client: SanityClient,
  commonOpts: WeightedSearchOptions,
) => (
  searchTerms: string | SearchTerms,
  searchOpts?: SearchOptions,
) => Observable<WeightedHit[] | SearchHitsPage>

const searchStrategies: Record<SearchStrategy, SearchStrategyFactory> = {
  weighted: createWeightedSearch,
  text: createTextSearch,
  hybrid: createHybridSearch,
}

interface Options extends WeightedSearchOptions {
  strategy?: SearchStrategy
}

/** @internal */
export function createSearch(
  searchableTypes: SearchableType[],
  client: SanityClient,
  options: Options = {},
): (query: string, opts?: SearchOptions) => Observable<(WeightedHit | {hit: SearchHit})[]> {
  const strategy = options.strategy ?? 'weighted'
  return searchStrategies[strategy](searchableTypes, client, options)
}

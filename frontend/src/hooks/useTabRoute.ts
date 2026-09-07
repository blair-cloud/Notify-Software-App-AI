import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Drives a dashboard's tab state from the URL.
 *
 * Returns the same `[activeTab, setActiveTab]` pair the dashboards already
 * used, so existing call sites keep working - but the URL is now the source of
 * truth. That is what makes refresh, deep links and Back/Forward behave.
 *
 * @param basePath  e.g. "/landlord"
 * @param defaultTab tab used when the URL has none or an unknown one
 * @param validTabs  the tabs this dashboard actually has
 */
export function useTabRoute<T extends string>(
  basePath: string,
  defaultTab: T,
  validTabs: readonly T[]
): [T, (tab: T) => void] {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();

  const activeTab = (validTabs.includes(tab as T) ? (tab as T) : defaultTab);

  const setActiveTab = useCallback(
    (next: T) => {
      if (next === tab) return;
      navigate(`${basePath}/${next}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [navigate, basePath, tab]
  );

  return [activeTab, setActiveTab];
}

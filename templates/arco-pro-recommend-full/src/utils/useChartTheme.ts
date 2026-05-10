import { useSelector } from 'react-redux';

/**
 * Returns the @ant-design/charts theme name matching the current app theme.
 * Pass the result as `theme={...}` on Line / Column / Pie / etc.
 *
 * (Replaces the previous BizCharts G2.registerTheme/getTheme dance — the
 * v2 Ant Design Charts components accept a theme name directly.)
 */
function useChartTheme(): 'classic' | 'classicDark' {
  const theme = useSelector((state: { theme?: string }) => state.theme);
  return theme === 'dark' ? 'classicDark' : 'classic';
}

export default useChartTheme;

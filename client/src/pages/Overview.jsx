import { useState } from 'react';
import { fetchDashboard } from '../api.js';
import { useApi } from '../hooks.js';
import { useFilters } from '../filters-context.jsx';
import Kpis from '../components/Kpis.jsx';
import Insights from '../components/Insights.jsx';
import RecordsTable from '../components/RecordsTable.jsx';
import { PageState } from '../components/PageState.jsx';
import { TrendChart, BarBreakdown, DonutBreakdown, TopItems, HourChart, WeekdayChart } from '../components/Charts.jsx';

export default function Overview({ session }) {
  const { filters, toggle, reset } = useFilters();
  const [granularity, setGranularity] = useState('');
  const { data, loading, error } = useApi((s) => fetchDashboard(filters, granularity, s), [filters, granularity]);

  return (
    <PageState kind="dashboard" data={data} loading={loading} error={error} empty={data?.kpis.orders === 0} onReset={reset}>
      {data && (
        <>
          <Kpis data={data} />
          <Insights items={data.insights} filters={filters} aiEnabled={session.features?.ai} />
          <TrendChart data={data} granularity={granularity} onGranularity={setGranularity} />
          <section className="grid g3">
            <BarBreakdown title="Revenue by outlet" rows={data.outlets} selected={filters.outlets} onPick={(v) => toggle('outlets', v)} />
            <DonutBreakdown title="Order type" rows={data.orderTypes} selected={filters.orderTypes} onPick={(v) => toggle('orderTypes', v)} />
            <DonutBreakdown title="Payment / channel" rows={data.settlements} selected={filters.settlements} onPick={(v) => toggle('settlements', v)} />
          </section>
          <section className="grid g2">
            <BarBreakdown title="Revenue by category" rows={data.groups} selected={filters.groups} onPick={(v) => toggle('groups', v)} />
            <TopItems byRevenue={data.topItemsByRevenue} byUnits={data.topItemsByUnits} />
          </section>
          <section className="grid g2">
            <HourChart rows={data.hours} />
            <WeekdayChart rows={data.weekdays} />
          </section>
          <RecordsTable filters={filters} />
        </>
      )}
    </PageState>
  );
}

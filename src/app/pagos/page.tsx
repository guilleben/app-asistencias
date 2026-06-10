import { PageHeader } from "@/components/page-header";
import { PaymentList } from "@/components/payments/payment-list";
import { WeekNav } from "@/components/week-nav";
import { todayIso, weekStartIso } from "@/lib/dates";
import { getWeekPayroll } from "@/lib/payroll";
import { formatARS } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const weekStart = weekStartIso(
    week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : todayIso(),
  );

  const payroll = await getWeekPayroll(weekStart);
  const totalSuggested = payroll.reduce((acc, p) => acc + p.suggestedTotal, 0);
  const totalPaid = payroll.reduce(
    (acc, p) => acc + (p.payment?.totalPaid ?? 0),
    0,
  );

  return (
    <div>
      <PageHeader title="Pagos" description="Pago semanal por empleado">
        <WeekNav weekStart={weekStart} basePath="/pagos" />
      </PageHeader>

      <div className="stat-grid mb-6">
        <div className="stat-card">
          <p className="label-caption font-semibold">Total estimado</p>
          <p className="stat-value mt-1">{formatARS(totalSuggested)}</p>
        </div>
        <div className="stat-card">
          <p className="label-caption font-semibold">Ya pagado</p>
          <p className="stat-value mt-1 text-success">{formatARS(totalPaid)}</p>
        </div>
      </div>

      <PaymentList weekStart={weekStart} payroll={payroll} />
    </div>
  );
}

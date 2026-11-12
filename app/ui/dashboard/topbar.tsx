export function DashboardTopbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="border-b border-gray-200 bg-white px-6 py-5 sm:px-8">
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

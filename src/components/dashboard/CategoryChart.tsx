import { IncomeCategoryReferenceCard } from "./IncomeCategoryReferenceCard";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface CategoryChartProps {
  data: CategoryData[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  return <IncomeCategoryReferenceCard data={data} />;
}
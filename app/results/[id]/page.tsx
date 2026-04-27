import { ResultsClient } from './_components/results-client';

export default function ResultsPage({ params }: { params: { id: string } }) {
  return <ResultsClient assessmentId={params?.id ?? ''} />;
}

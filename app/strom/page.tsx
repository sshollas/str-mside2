import rawDump from '@/data/stromapi-mockup.json';
import { toPriceDump } from '@/lib/strom/utils';
import StromClient from './StromClient';

export default function StromPage() {
  const initial = toPriceDump(rawDump);
  return <StromClient initial={initial} />;
}

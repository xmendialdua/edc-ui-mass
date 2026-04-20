import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Publication - Mondragon Assembly Data Space',
  description: 'Manage and publish data assets in the Mondragon Assembly data space'
};

export default function DataPublicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

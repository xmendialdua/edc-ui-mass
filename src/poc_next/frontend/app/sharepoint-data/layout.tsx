/**
 * Layout for SharePoint Data Browser
 * Authentication is provided by the root layout
 */

export const metadata = {
  title: 'SharePoint Data Browser - POC Next',
  description: 'Explora y descarga archivos de SharePoint',
};

export default function SharePointDataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

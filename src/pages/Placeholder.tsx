import { useLocation } from "react-router-dom";

const PlaceholderPage = () => {
  const location = useLocation();
  const pageName = location.pathname.substring(1).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-4xl font-bold tracking-tight">{pageName || "Page"}</h1>
      <p className="text-muted-foreground mt-2">This page is under construction.</p>
    </div>
  );
};

export default PlaceholderPage;
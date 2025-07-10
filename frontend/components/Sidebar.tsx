import { FaUsers, FaClock, FaUserAlt, FaStar, FaMapMarkedAlt, FaFileAlt, FaFileInvoice, FaClipboardList } from "react-icons/fa";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  return (
    <aside className="w-64 bg-white border-r min-h-screen shadow-sm flex flex-col">
      <div className="p-4 border-b">
        <img src="/logo.svg" alt="Logo" className="h-16" />
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 text-sm font-medium text-gray-700">
        <NavLink to="/utilisateurs" className="flex items-center gap-2 hover:text-blue-600">
          <FaUsers /> Utilisateurs
        </NavLink>
        <NavLink to="/heures" className="flex items-center gap-2 hover:text-blue-600">
          <FaClock /> Relevé d'heures global
        </NavLink>
        <NavLink to="/clients" className="flex items-center gap-2 hover:text-blue-600">
          <FaUserAlt /> Clients
        </NavLink>
        <NavLink to="/fournisseurs" className="flex items-center gap-2 hover:text-blue-600">
          <FaStar /> Fournisseurs
        </NavLink>
        <NavLink to="/agences" className="flex items-center gap-2 hover:text-blue-600">
          <FaMapMarkedAlt /> Agences
        </NavLink>

        <p className="text-xs text-gray-400 pt-4">DOCUMENTS</p>

        <NavLink to="/reparations" className="flex items-center gap-2 hover:text-blue-600">
          <FaFileAlt /> Demandes de réparation
        </NavLink>
        <NavLink to="/devis" className="flex items-center gap-2 hover:text-blue-600">
          <FaFileInvoice /> Devis
        </NavLink>
        <NavLink to="/fiches" className="flex items-center gap-2 hover:text-blue-600">
          <FaClipboardList /> Fiche d'intervention
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
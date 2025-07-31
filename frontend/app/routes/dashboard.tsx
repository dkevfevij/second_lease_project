import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../config";

interface Camion {
  numero_chassis: string;
  statut: string;
  a_des_alertes: boolean;
  date_creation?: string;
}

export default function Dashboard() {
  const [camions, setCamions] = useState<Camion[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statutFiltre, setStatutFiltre] = useState("");
  const [alerteFiltre, setAlerteFiltre] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userRole = localStorage.getItem("role");
    if (!token) {
      navigate("/login");
      return;
    }
    setRole(userRole);
  }, []);

  useEffect(() => {
    fetchCamions();
  }, [sortOrder, statutFiltre, alerteFiltre, currentPage]);

  const fetchCamions = async () => {
  try {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams();
    params.append("sort", sortOrder);
    if (statutFiltre) params.append("statut", statutFiltre);
    if (alerteFiltre) params.append("alertes", alerteFiltre);
    params.append("page", currentPage.toString());
    params.append("limit", pageSize.toString());

    const res = await axios.get(`${API_BASE_URL}/api/camions/liste_complets?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setCamions(res.data ?? []);
  } catch (err) {
    console.error("Erreur API camions:", err);
  }
};


  const filtered = camions.filter((c) =>
    c.numero_chassis.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedCamions = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filtered.length / pageSize);

  const badgeColor = (statut: string) => {
    switch (statut.toLowerCase()) {
      case "en_attente": return "bg-[#fef2f2] text-[#b91c1c] border border-[#fca5a5]";
      case "en_cours": return "bg-[#fff7ed] text-[#c2410c] border border-[#fdba74]";
      case "pret_a_livrer": return "bg-[#eef2ff] text-[#4338ca] border border-[#a5b4fc]";
      case "livré": return "bg-[#eef2ff] text-[#4338ca] border border-[#a5b4fc]";
      default: return "bg-[#ecfdf5] text-[#047857] border border-[#6ee7b7]";
    }
  };

  const handleRemoveFilter = (filterType: string) => {
    if (filterType === "statut") setStatutFiltre("");
    if (filterType === "alerte") setAlerteFiltre("");
    if (filterType === "sort") setSortOrder("desc");
    setCurrentPage(1);
    if (!statutFiltre && !alerteFiltre && filterType !== "sort") setSortOrder("desc"); // Ensure default sort when no filters
    fetchCamions();
  };

  const toggleStatutFiltre = (statut: string) => {
    setStatutFiltre(statutFiltre === statut ? "" : statut);
    setCurrentPage(1);
    fetchCamions();
  };

  const toggleAlerteFiltre = (value: string) => {
    setAlerteFiltre(alerteFiltre === value ? "" : value);
    setCurrentPage(1);
    fetchCamions();
  };

  const alertCount = filtered.filter((c) => c.a_des_alertes).length;

  return (
     <div className="flex min-h-screen">
  <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between">
    <div>
      <img src="/logo2.png" alt="Bonne Route Auto" className="h-24 mb-4" />
      <nav className="space-y-3 text-base">
        {[
          { icon: "", label: "Dashboard", path: "/dashboard", adminOnly: false },
          { icon: "", label: "Ajouter Camions", path: "/ajouter-camion", adminOnly: true },
          { icon: "", label: "Utilisateurs", path: "/ListeUtilisateurs", adminOnly: true },
        ]
          .filter((item) => !(item.adminOnly && role === "viewer")) // 👈 cache si viewer
          .map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${
                location.pathname === item.path ? "bg-blue-50 text-blue-600 font-semibold" : ""
              }`}
            >
              <span className="mr-3">{item.icon}</span> {item.label}
            </button>
          ))}
      </nav>
    </div>

        <button
          onClick={() => navigate("/login")}
          className="text-sm text-red-600 hover:underline flex items-center gap-2"
        >
          <span></span> Se déconnecter
        </button>
      </aside>

      <main className="flex-1 p-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-[#1a5c97]">
              <h2 className="text-lg font-bold text-white">Liste des camions</h2>
              <div className="flex items-center gap-2">
                {role === "admin" && (
                  <button
                    onClick={() => navigate("/ajouter-camion")}
                    className="bg-white text-[#1a5c97] rounded-full w-7 h-7 flex items-center justify-center hover:bg-blue-100 font-bold text-base"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-3">
                <input
                  type="text"
                  placeholder="Rechercher par N° de châssis"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full max-w-xs px-3 py-1.5 border rounded-md shadow-sm text-xs"
                />
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">
                  {alertCount} camion{alertCount !== 1 ? "s" : ""} avec alerte
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => toggleStatutFiltre("en_attente")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    statutFiltre === "en_attente" ? "bg-gray-200 text-gray-900" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  En attente
                </button>
                <button
                  onClick={() => toggleStatutFiltre("en_cours")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    statutFiltre === "en_cours" ? "bg-gray-200 text-gray-900" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  En cours
                </button>
                <button
                  onClick={() => toggleStatutFiltre("pret_a_livrer")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    statutFiltre === "pret_a_livrer" ? "bg-gray-200 text-gray-900" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Prêt à livrer
                </button>
                <button
                  onClick={() => toggleStatutFiltre("livré")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    statutFiltre === "livré" ? "bg-gray-200 text-gray-900" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Livré
                </button>
                <button
                  onClick={() => toggleAlerteFiltre("true")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    alerteFiltre === "true" ? "bg-gray-200 text-gray-900" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Avec alerte
                </button>
                <button
                  onClick={() => toggleAlerteFiltre("false")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    alerteFiltre === "false" ? "bg-gray-200 text-gray-900" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Sans alerte
                </button>
                <button
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h18M3 10h12M3 16h6" />
                  </svg>
                  {sortOrder === "desc" ? "Date ↓" : "Date ↑"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {statutFiltre && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor(statutFiltre)} flex items-center gap-1`}>
                    {statutFiltre.replaceAll("_", " ")}
                    <button
                      onClick={() => handleRemoveFilter("statut")}
                      className="ml-1 text-xs hover:text-red-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {alerteFiltre && (
                  <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    {alerteFiltre === "true" ? "Avec alerte" : "Sans alerte"}
                    <button
                      onClick={() => handleRemoveFilter("alerte")}
                      className="ml-1 text-xs hover:text-red-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
                {sortOrder === "asc" && (
                  <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    Date ↑
                    <button
                      onClick={() => handleRemoveFilter("sort")}
                      className="ml-1 text-xs hover:text-red-600"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#e6eef5] text-[#1a5c97]">
                      <th className="px-3 py-1.5 text-left font-semibold">Numéro de châssis</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Statut</th>
                      <th className="px-3 py-1.5 text-left font-semibold">Alerte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCamions.map((c, i) => (
                      <tr
                        key={c.numero_chassis}
                        className={`cursor-pointer ${i % 2 === 0 ? "bg-white" : "bg-blue-50"} hover:bg-gray-100`}
                        onClick={() => navigate(`/camions/${c.numero_chassis}`)}
                      >
                        <td className="px-3 py-1.5">{c.numero_chassis}</td>
                        <td className="px-3 py-1.5">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badgeColor(c.statut)}`}>
                            {(c.statut ?? "").replaceAll("_", " ") || "Inconnu"}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 relative group">
                          <span className={`text-lg ${c.a_des_alertes ? "text-red-600 blink" : "text-green-600"}`}>
                            {c.a_des_alertes ? "⚠️" : "✔️"}
                            {c.a_des_alertes && (
                              <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-1 -top-8 left-1/2 transform -translate-x-1/2">
                                Alerte active
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center mt-3">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-xs disabled:opacity-50 hover:bg-gray-300"
                >
                  Précédent
                </button>
                <span className="text-xs text-gray-600">
                  Page {currentPage} sur {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md text-xs disabled:opacity-50 hover:bg-gray-300"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
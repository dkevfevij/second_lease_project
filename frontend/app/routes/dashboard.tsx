import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { useLocation } from "react-router-dom";



interface Camion {
  numero_chassis: string;
  statut: string;
  a_des_alertes: boolean;
}

export default function Dashboard() {
  const [camions, setCamions] = useState<Camion[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string | null>(null);
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
    fetchCamions();
  }, []);

  const fetchCamions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/camions`, {
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

  const badgeColor = (statut: string) => {
    switch (statut.toLowerCase()) {
      case "en_attente":
        return "bg-gray-300 text-gray-900";
      case "en_cours":
        return "bg-blue-300 text-blue-900";
      case "pret_a_livrer":
        return "bg-yellow-300 text-yellow-900";
      case "livré":
        return "bg-green-300 text-green-900";
      default:
        return "bg-gray-300 text-gray-800";
    }
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between">
        <div>
          <img src="/logo.svg" alt="Bonne Route Auto" className="h-20 mb-6" />
          <nav className="space-y-3 text-base">
            {[
              { icon: "🏠", label: "Dashboard", path: "/dashboard" },
              { icon: "🚛", label: "Ajouter Camions", path: "/ajouter-camion" },
              { icon: "👤", label: "Utilisateurs", path: "/ListeUtilisateurs" },
              { icon: "⚙️", label: "Paramètres", path: "" },
            ].map((item) => (
            <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`block w-full text-left px-3 py-2 hover:bg-gray-100 ${
                location.pathname === item.path ? "bg-blue-50 text-blue-600 font-semibold" : ""
            }`}
            >
            {item.label}
            </button>
            ))}
          </nav>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="text-base text-red-600 hover:underline flex items-center gap-2"
        >
          <span>🔓</span> Se déconnecter
        </button>
      </aside>

      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-md">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: "#1a5c97" }}>
              <h2 className="text-lg font-bold text-white">Liste des camions</h2>
              {role === "admin" && (
                <button
                  onClick={() => navigate("/ajouter-camion")}
                  className="bg-white text-[#1a5c97] rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-100 font-bold text-lg"
                >
                  +
                </button>
              )}
            </div>
            <div className="px-6 py-4">
              <input
                type="text"
                placeholder="Rechercher par N° de châssis"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-xs px-4 py-2 border rounded shadow-sm mb-4 text-sm"
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: "#e6eef5", color: "#1a5c97" }}>
                      <th className="px-4 py-2 text-left">Numéro de châssis</th>
                      <th className="px-4 py-2 text-left">Statut</th>
                      <th className="px-4 py-2 text-left">Alerte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr
                        key={c.numero_chassis}
                        className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}
                        onClick={() => navigate(`/camions/${c.numero_chassis}`)}
                      >
                        <td className="px-4 py-2">{c.numero_chassis}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor(
                              c.statut
                            )}`}
                          >
                            {(c.statut ?? "").replaceAll("_", " ") || "Inconnu"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xl">{c.a_des_alertes ? "⚠️" : "✔️"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
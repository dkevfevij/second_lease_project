import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const userRole = localStorage.getItem("role");
      setRole(userRole);

      axios
        .get("https://second-lease-backend.onrender.com/camions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((res) => setCamions(res.data))
        .catch((err) => console.error(err));
    }
  }, []);

  const filtered = camions.filter((c) =>
    c.numero_chassis.toLowerCase().includes(search.toLowerCase())
  );

  const badgeColor = (statut: string) => {
    switch (statut) {
      case "en_attente":
        return "bg-yellow-300 text-yellow-900";
      case "en_cours":
        return "bg-blue-300 text-blue-900";
      case "pret_a_livrer":
        return "bg-green-300 text-green-900";
      default:
        return "bg-gray-300 text-gray-800";
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between">
        <div>
          <img src="/logo.svg" alt="logo" className="h-16 mb-4" />
          <nav className="space-y-2">
            <button className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100">
              Dashboard
            </button>
            {role === "admin" && (
              <>
                <button className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100">
                  Ajouter Camion
                </button>
                <button className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100">
                  Ajouter Membre
                </button>
              </>
            )}
            <button className="block w-full text-left px-3 py-2 rounded hover:bg-gray-100">
              Paramètres
            </button>
          </nav>
        </div>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              localStorage.clear();
              navigate("/login");
            }
          }}
          className="text-sm text-red-600 hover:underline"
        >
          Se déconnecter
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 bg-gray-50">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Liste des camions</h1>
          <input
            type="text"
            placeholder="Rechercher par N° de châssis"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border rounded shadow-sm w-full max-w-sm"
          />
        </div>
        <table className="w-full text-left border-t">
          <thead>
            <tr className="text-sm text-gray-700">
              <th className="py-2">Numéro de châssis</th>
              <th className="py-2">Statut</th>
              <th className="py-2">Alerte</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr
                key={i}
                className="border-b hover:bg-gray-100 cursor-pointer"
              >
                <td className="py-2 px-2 font-medium">{c.numero_chassis}</td>
                <td className="py-2 px-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeColor(
                      c.statut
                    )}`}
                  >
                    {c.statut.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="py-2 px-2 text-xl">
                  {c.a_des_alertes ? "⚠️" : "✔️"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

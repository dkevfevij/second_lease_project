import { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { API_BASE_URL } from "../config";

interface User {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  actif: boolean;
}

export default function ListeUtilisateurs() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [roleNew, setRoleNew] = useState("viewer");
  const [showPassword, setShowPassword] = useState(false);

  const token = localStorage.getItem("token") || "";
  const role = localStorage.getItem("role") || "";
  const username = localStorage.getItem("username") || "Utilisateur";

  useEffect(() => {
    if (nom && prenom) {
      setIdentifiant(`${nom[0].toLowerCase()}.${prenom.toLowerCase()}`);
    } else {
      setIdentifiant("");
    }
  }, [nom, prenom]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data);
    } catch {
      toast.error("❌ Erreur lors du chargement des utilisateurs");
    }
  };

  const toggleActif = async (id: number) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/users/${id}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("✅ Statut mis à jour");
      fetchUsers();
    } catch {
      toast.error("❌ Impossible de changer le statut");
    }
  };

  const ajouterMembre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !prenom || !motDePasse) {
      toast.error("Tous les champs sont requis !");
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/users`, {
        nom,
        prenom,
        mot_de_passe: motDePasse,
        role: roleNew,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("✅ Membre ajouté !");
      setShowModal(false);
      setNom(""); setPrenom(""); setMotDePasse(""); setIdentifiant("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "❌ Erreur lors de l'ajout");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filtered = users.filter((u) =>
    (u.nom + u.prenom + u.role).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <aside className="w-64 bg-[#879cae] text-white p-6 space-y-4">
        <img src="/logo.svg" alt="Logo" className="w-32 mx-auto mb-6" />
        <h2 className="text-xl font-bold text-center">Bonne Route Auto</h2>
        <nav className="mt-8 space-y-3 text-sm">
          <a href="/dashboard" className="block hover:underline">Dashboard</a>
          <a href="/ListeUtilisateurs" className="block underline">Utilisateurs</a>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1">
        {/* Header */}
        <header className="bg-white shadow px-6 py-4 flex justify-between items-center border-b">
          <span className="font-medium text-sm text-gray-700">
            Connecté : {username} ({role})
          </span>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = "/login";
            }}
            className="text-sm text-red-600 hover:underline"
          >
            Se déconnecter
          </button>
        </header>

        {/* Contenu */}
        <div className="p-6">
          <div className="bg-white rounded shadow-md">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: "#1a5c97" }}>
              <h2 className="text-lg font-bold text-white">Liste des utilisateurs</h2>
              {role === "admin" && (
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-white text-[#1a5c97] rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-100 font-bold text-lg"
                >
                  +
                </button>
              )}
            </div>

            <div className="px-6 py-4">
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-xs px-4 py-2 border rounded shadow-sm mb-4 text-sm"
              />

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: "#e6eef5", color: "#1a5c97" }}>
                      <th className="px-4 py-2 text-left">Nom</th>
                      <th className="px-4 py-2 text-left">Prénom</th>
                      <th className="px-4 py-2 text-left">Rôle</th>
                      <th className="px-4 py-2 text-center">Actif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => (
                      <tr key={u.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                        <td className="px-4 py-2">{u.nom}</td>
                        <td className="px-4 py-2">{u.prenom}</td>
                        <td className="px-4 py-2">{u.role}</td>
                        <td className="px-4 py-2 text-center">
                          {role === "admin" ? (
                            <input
                              type="checkbox"
                              checked={u.actif}
                              onChange={() => toggleActif(u.id)}
                              className="h-4 w-4 cursor-pointer"
                            />
                          ) : (
                            <span>{u.actif ? "Oui" : "Non"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MODALE AJOUT MEMBRE */}
          {showModal && (
            <div className="fixed inset-0 bg-white/70 backdrop-blur-sm flex justify-center items-center z-50">
              <div className="bg-white w-[550px] rounded shadow-lg p-8 relative border border-blue-200">
                <h3 className="text-xl font-semibold text-[#1a5c97] mb-6 text-center">Ajouter un membre</h3>
                <form className="space-y-4" onSubmit={ajouterMembre}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nom</label>
                      <input
                        type="text"
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Prénom</label>
                      <input
                        type="text"
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Identifiant</label>
                    <input
                      type="text"
                      value={identifiant}
                      readOnly
                      className="w-full px-3 py-2 bg-gray-100 border rounded text-gray-500"
                    />
                  </div>

                  <div className="relative">
                    <label className="text-sm font-medium text-gray-700">Mot de passe</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-[34px] right-3 text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Rôle</label>
                    <select
                      value={roleNew}
                      onChange={(e) => setRoleNew(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#1a5c97] hover:bg-blue-800 text-white rounded shadow"
                    >
                      Ajouter
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

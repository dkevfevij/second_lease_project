import { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { API_BASE_URL } from "../config";
import { useNavigate, useLocation } from "react-router-dom";

interface User {
  id: number;
  nom: string;
  prenom: string;
  role: string;
  actif: boolean;
  identifiant?: string;
}

export default function ListeUtilisateurs() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [roleNew, setRoleNew] = useState("viewer");
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState("");
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("Utilisateur");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setToken(localStorage.getItem("token") || "");
    setRole(localStorage.getItem("role") || "");
    setUsername(localStorage.getItem("username") || "Utilisateur");
  }, []);

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

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const ajouterMembre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !prenom || !motDePasse) return toast.error("Champs requis !");
    try {
      await axios.post(
        `${API_BASE_URL}/api/users`,
        { nom, prenom, mot_de_passe: motDePasse, role: roleNew },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("✅ Membre ajouté !");
      fermerModale();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "❌ Erreur");
    }
  };

  const modifierUtilisateur = async () => {
    if (!selectedUser) return;
    try {
      await axios.put(
        `${API_BASE_URL}/api/users/${selectedUser.id}`,
        {
          nom,
          prenom,
          role: roleNew,
          mot_de_passe: motDePasse || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("✅ Membre modifié");
      fermerModale();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "❌ Erreur");
    }
  };

  const supprimerUtilisateur = async () => {
    if (!selectedUser) return;
    const confirm = window.confirm("⚠️ Supprimer ce membre ?");
    if (!confirm) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/users/${selectedUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("🗑️ Membre supprimé");
      fermerModale();
      fetchUsers();
    } catch (err: any) {
      toast.error("Erreur suppression");
    }
  };

  const toggleActif = async (id: number) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/users/${id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUsers();
    } catch {
      toast.error("Erreur statut");
    }
  };

  const ouvrirModaleEdition = (user: User) => {
    setSelectedUser(user);
    setNom(user.nom);
    setPrenom(user.prenom);
    setRoleNew(user.role);
    setIdentifiant(user.identifiant || "");
    setMotDePasse("");
    setShowModal(true);
  };

  const fermerModale = () => {
    setSelectedUser(null);
    setNom("");
    setPrenom("");
    setRoleNew("viewer");
    setMotDePasse("");
    setIdentifiant("");
    setShowModal(false);
  };

  const filtered = users.filter((u) =>
    (u.nom + u.prenom + u.role).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen">
      <Toaster position="top-right" />
      <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between">
        <div>
          <img src="/logo2.png" className="h-24 mb-4" />
          <nav className="space-y-3 text-base">
            {[
              { label: "Dashboard", path: "/dashboard" },
              { label: "Ajouter Camions", path: "/ajouter-camion" },
              { label: "Utilisateurs", path: "/ListeUtilisateurs" },
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
        <button onClick={() => { localStorage.clear(); navigate("/login"); }}
          className="text-base text-red-600 hover:underline">Se déconnecter</button>
      </aside>

      <main className="flex-1 p-8 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-center px-6 py-4 border-b" style={{ backgroundColor: "#1a5c97" }}>
              <h2 className="text-white font-bold">Liste des utilisateurs</h2>
              {role === "admin" && (
                <button onClick={() => setShowModal(true)}
                  className="bg-white text-[#1a5c97] w-8 h-8 rounded-full font-bold hover:bg-blue-100">+</button>
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
                    <tr key={u.id}
                      className={`${i % 2 === 0 ? "bg-white" : "bg-blue-50"} cursor-pointer`}
                      onClick={() => ouvrirModaleEdition(u)}
                    >
                      <td className="px-4 py-2">{u.nom}</td>
                      <td className="px-4 py-2">{u.prenom}</td>
                      <td className="px-4 py-2">{u.role}</td>
                      <td className="px-4 py-2 text-center">
                        {role === "admin" ? (
                          <input type="checkbox" checked={u.actif} onChange={(e) => {
                            e.stopPropagation();
                            toggleActif(u.id);
                          }} />
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

          {showModal && (
            <div className="fixed inset-0 bg-white bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white w-[550px] rounded-lg shadow-lg p-8 relative border border-blue-200">
                <h3 className="text-xl font-semibold text-[#1a5c97] mb-6 text-center">
                  {selectedUser ? "Modifier le membre" : "Ajouter un membre"}
                </h3>
                <form
                  className="space-y-4"
                  onSubmit={selectedUser ? (e) => { e.preventDefault(); modifierUtilisateur(); } : ajouterMembre}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" className="px-3 py-2 border rounded" />
                    <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" className="px-3 py-2 border rounded" />
                  </div>
                  <input readOnly value={identifiant} className="w-full px-3 py-2 bg-gray-100 border rounded text-gray-500" />
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      placeholder="Mot de passe"
                      className="w-full px-3 py-2 border rounded"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-2.5 right-3 text-gray-600">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <select value={roleNew} onChange={(e) => setRoleNew(e.target.value)} className="w-full px-3 py-2 border rounded">
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <div className="flex justify-between pt-4">
                    {selectedUser && (
                      <button type="button" onClick={supprimerUtilisateur} className="text-red-600 hover:underline">Supprimer</button>
                    )}
                    <div className="space-x-3">
                      <button type="button" onClick={fermerModale} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded">
                        Annuler
                      </button>
                      <button type="submit" className="px-4 py-2 bg-[#1a5c97] hover:bg-[#14497a] text-white rounded shadow">
                        {selectedUser ? "Modifier" : "Ajouter"}
                      </button>
                    </div>
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

// frontend/app/routes/AjouterMembre.tsx
import React, { useState, useEffect } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "../config";

export default function AjouterMembre() {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState("viewer");
  const [showPassword, setShowPassword] = useState(false);
  const [erreurs, setErreurs] = useState<{ [key: string]: boolean }>({});

  const navigate = useNavigate();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const togglePassword = () => setShowPassword(!showPassword);

  useEffect(() => {
    if (nom && prenom) {
      setIdentifiant(`${nom[0].toLowerCase()}.${prenom.toLowerCase()}`);
    } else {
      setIdentifiant("");
    }
  }, [nom, prenom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const champsManquants: any = {};
    if (!nom) champsManquants.nom = true;
    if (!prenom) champsManquants.prenom = true;
    if (!motDePasse) champsManquants.motDePasse = true;

    setErreurs(champsManquants);

    if (Object.keys(champsManquants).length > 0) {
      toast.error("Merci de remplir tous les champs obligatoires.");
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/api/users`,
        {
          nom,
          prenom,
          mot_de_passe: motDePasse,
          role,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("✅ Membre ajouté avec succès !");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "❌ Erreur lors de l'ajout");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <Toaster position="top-right" />
      <div className="w-[1100px] bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="flex">
          {/* Section gauche */}
          <div className="w-1/2 bg-[#f5f7fa] p-10 flex flex-col items-center justify-center text-center">
            <img src="/logo.svg" alt="Logo Bonne Route" className="w-44 mb-6" />
            <h2 className="text-4xl font-bold text-[#1a5c97]">BONNE ROUTE <span className="text-red-600">AUTO</span></h2>
            <p className="text-gray-600 mt-4 font-medium text-sm">Réservé aux administrateurs</p>
            <p className="text-xs text-gray-500 mt-20">Copyright 2025 © Foliatech</p>
          </div>

          {/* Section droite */}
          <div className="w-1/2 p-10 bg-white">
            <h3 className="text-xl font-bold text-[#1a5c97] mb-6">AJOUTER UN MEMBRE</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block mb-1">* Nom</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className={`w-full px-4 py-2 border rounded ${erreurs.nom ? "border-red-500" : "border-gray-300"}`}
                />
                {erreurs.nom && <p className="text-xs text-red-500 mt-1">Champ requis</p>}
              </div>

              <div>
                <label className="block mb-1">* Prénom</label>
                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className={`w-full px-4 py-2 border rounded ${erreurs.prenom ? "border-red-500" : "border-gray-300"}`}
                />
                {erreurs.prenom && <p className="text-xs text-red-500 mt-1">Champ requis</p>}
              </div>

              <div className="col-span-2">
                <label className="block mb-1">Identifiant (généré automatiquement)</label>
                <input
                  type="text"
                  value={identifiant}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-200 bg-gray-100 text-gray-500 rounded"
                />
              </div>

              <div className="col-span-2 relative">
                <label className="block mb-1">* Mot de passe</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  className={`w-full px-4 py-2 border rounded pr-10 ${erreurs.motDePasse ? "border-red-500" : "border-gray-300"}`}
                />
                <button
                  type="button"
                  onClick={togglePassword}
                  className="absolute right-3 top-[38px] text-gray-600"
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
                {erreurs.motDePasse && <p className="text-xs text-red-500 mt-1">Champ requis</p>}
              </div>

              <div className="col-span-2">
                <label className="block mb-1">Rôle</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded"
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="col-span-2 mt-4">
                <button
                  type="submit"
                  className="w-full bg-[#1a5c97] hover:bg-[#144a78] text-white py-2 rounded font-medium shadow"
                >
                  Ajouter le membre
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

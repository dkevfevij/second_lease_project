import React, { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { loginUser } from "../services/api";
import { useNavigate } from "react-router-dom";

export const loader = () => null;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [nomUtilisateur, setNomUtilisateur] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(false); // ⬅️ état de chargement
  const navigate = useNavigate();

  const togglePassword = () => setShowPassword(!showPassword);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur("");
    setLoading(true); // ⬅️ début du chargement

    try {
      const data = await loginUser({
        username: nomUtilisateur,
        password: motDePasse,
      });

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("username", data.user.username);

      navigate("/dashboard");
    } catch (err: any) {
      setErreur(err.message || "Erreur inconnue");
    } finally {
      setLoading(false); // ⬅️ fin du chargement
    }
  };

  return (
    <div className="min-h-screen w-screen m-0 p-0 flex items-center justify-center bg-gray-100">
      <div className="flex w-[1100px] h-[600px] bg-white shadow-2xl rounded-lg overflow-hidden">
        {/* Section gauche */}
        <div className="w-1/2 bg-gray-50 px-10 py-12 flex flex-col justify-center items-center text-center relative">
          <img src="/logo2.png" alt="Bonne Route Logo" className="w-130 mb-3" />
          <p className="mt-4 text-md text-gray-700 font-medium">Bienvenue sur Bonne Route Auto</p>
          <p className="mt-1 text-sm text-gray-600 px-6">
            Application de suivi des camions Second Lease.
          </p>
          <p className="mt-16 text-xs text-gray-500">Copyright 2025 © , Tous les droits sont réservés.</p>
        </div>

        {/* Section droite */}
        <div className="w-1/2 px-10 py-12 flex flex-col justify-center items-center bg-white">
          <h3 className="text-2xl font-semibold text-blue-900 text-center mb-8">APPLICATION DE SUIVI</h3>

          <form className="space-y-6 w-full max-w-sm" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">* NOM D'UTILISATEUR</label>
              <input
                type="text"
                required
                value={nomUtilisateur}
                onChange={(e) => setNomUtilisateur(e.target.value)}
                placeholder="ex: n.hilali"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">* MOT DE PASSE</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute right-3 top-9 text-gray-600 hover:text-gray-800"
              >
                {showPassword ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>

            {erreur && <p className="text-red-600 text-sm">{erreur}</p>}

            <div className="text-right text-sm text-blue-600 hover:underline cursor-pointer">
              Mot de passe oublié
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a5c97] hover:bg-[#14497a] text-white px-4 py-2 rounded shadow flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
                    />
                  </svg>
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </button>

            {erreur && <span className="text-sm text-gray-600">{erreur}</span>}
          </form>
        </div>
      </div>
    </div>
  );
}

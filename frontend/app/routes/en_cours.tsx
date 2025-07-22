import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useLocation } from "react-router-dom";




interface Camion {
  statut: string;
  immatriculation_etrangere: string;
  marque: string;
  modele: string;
  kilometrage: number;
  date_mise_en_circulation: string;
  client?: string;
  inspection_reception: string;
}

interface Prestation {
  id: number;
  reference: string;
  description: string;
  est_validee: boolean;
  fiche_reference: string;
}

interface Piece {
  id: number;
  reference: string;
  designation: string;
  quantite: number;
  est_livree: boolean;
  fiche_reference: string;
}

export default function EnCoursCamion() {
  const { chassis } = useParams();
  const [camion, setCamion] = useState<Camion | null>({
    statut: "attente",
    immatriculation_etrangere: "",
    marque: "",
    modele: "",
    kilometrage: 0,
    date_mise_en_circulation: "",
    client: "",
    inspection_reception: "",
  });
  const [ficheRef, setFicheRef] = useState("");
  const [message, setMessage] = useState("");
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [fiches, setFiches] = useState<string[]>([]);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token"));
      setRole(localStorage.getItem("role"));
    }
  }, []);

  const fetchCamionData = async () => {
    if (!token || !chassis) return;
    try {
      const camionRes = await axios.get(`${API_BASE_URL}/api/camions/${chassis}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = camionRes.data;
      setCamion({
        ...data,
        statut: data.statut ? data.statut.toLowerCase() : "attente",
      });

      const elementsRes = await axios.get(
        `${API_BASE_URL}/api/camions/${chassis}/elements_fiche`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPrestations(elementsRes.data.prestations);
      setPieces(elementsRes.data.pieces);
      setFiches(elementsRes.data.fiches || []);
    } catch (err) {
      console.error("Erreur chargement données camion et fiche", err);
    }
  };

  useEffect(() => {
    fetchCamionData();
  }, [token]);

  const importerFiche = async () => {
    if (!ficheRef.match(/^FIT\d{4}-\d{5}$/)) {
      setMessage("Référence invalide. Format attendu : FIT2025-xxxxx");
      return;
    }
    setLoadingImport(true);
    setMessage("");
    try {
      await axios.post(
        `${API_BASE_URL}/api/importer_fiche/${ficheRef}`,
        { chassis },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await axios.patch(
        `${API_BASE_URL}/api/camions/${chassis}/changer-statut`,
        { nouveau_statut: "en_cours" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCamion((prev) => {
        const newCamion = prev ? { ...prev, statut: "en_cours" } : {
          statut: "en_cours",
          immatriculation_etrangere: "",
          marque: "",
          modele: "",
          kilometrage: 0,
          date_mise_en_circulation: "",
          client: "",
          inspection_reception: "",
        };
        console.log("Optimistic update to:", newCamion.statut);
        return newCamion;
      });
      await fetchCamionData();
      setMessage("Importation réussie et statut mis à jour ✅");
    } catch (e) {
      setMessage("Erreur lors de l'importation");
      await fetchCamionData();
    } finally {
      setLoadingImport(false);
    }
  };

  const handleCheckPrestation = async (id: number, value: boolean) => {
    if (role !== "admin") return;
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/api/prestations/${id}`,
        { est_validee: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 200) {
        setPrestations((prev) =>
          prev.map((p) => (p.id === id ? { ...p, est_validee: value } : p))
        );
      }
    } catch (err) {
      console.error("Erreur mise à jour prestation", err);
    }
  };

  const handleCheckPiece = async (id: number, value: boolean) => {
    if (role !== "admin") return;
    try {
      const res = await axios.patch(
        `${API_BASE_URL}/api/pieces/${id}`,
        { est_livree: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 200) {
        setPieces((prev) =>
          prev.map((p) => (p.id === id ? { ...p, est_livree: value } : p))
        );
      }
    } catch (err) {
      console.error("Erreur mise à jour pièce", err);
    }
  };

  const handleStatusChange = async () => {
    setLoadingStatus(true);
    try {
      await axios.patch(
        `${API_BASE_URL}/api/camions/${chassis}/changer-statut`,
        { nouveau_statut: "pret_a_livrer" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Statut mis à jour avec succès ✅");
      await fetchCamionData();
    } catch (e) {
      setMessage("Erreur lors de la mise à jour du statut");
    } finally {
      setLoadingStatus(false);
      setShowModal(false);
    }
  };

  const toutesValidees = prestations.every((p) => p.est_validee) && pieces.every((p) => p.est_livree);
  const statutColor = {
    attente: "",
    en_attente:"bg-yellow-100 text-yellow-800",
    en_cours: "bg-blue-100 text-blue-800",
    pret_a_livrer: "bg-green-100 text-green-800",
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
                <span className="mr-3">{item.icon}</span> {item.label}
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

      <main className="flex-1 p-8 bg-gray-50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-[#1a5c97]">Numéro de Châssis : {chassis}</h2>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm px-4 py-1 rounded-full ${
                statutColor[camion?.statut as keyof typeof statutColor] || "bg-gray-100"
              }`}
            >
              {camion?.statut?.replace("_", " ") || "Attente"}
            </span>
            <button className="text-gray-500 hover:text-gray-700" onClick={fetchCamionData}></button>
          </div>
        </div>

        {camion && (
          <div className="bg-white p-6 rounded-lg shadow mb-6 grid grid-cols-2 gap-6">
            <div>
              <strong>Immatriculation :</strong> {camion.immatriculation_etrangere}{" "}
              <span className="text-gray-500 cursor-pointer"></span>
            </div>
            <div>
              <strong>Marque :</strong> {camion.marque}
            </div>
            <div>
              <strong>Modèle :</strong> {camion.modele}
            </div>
            <div>
              <strong>Kilométrage :</strong> {camion.kilometrage} km
            </div>
            <div>
              <strong>Date de mise en circulation :</strong> {camion.date_mise_en_circulation}
            </div>
            <div>
              <strong>Client :</strong> {camion.client || "N/A"}
            </div>
            <div className="col-span-2">
              <strong>Inspection :</strong>{" "}
              {camion.inspection_reception ? (
                camion.inspection_reception
              ) : (
                <span className="text-red-500">⚠️ Contrôle manquant</span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-6 relative">
          <div className="group">
            <input
              type="text"
              placeholder="Réf fiche ex: FIT2025-xxxxx"
              value={ficheRef}
              onChange={(e) => setFicheRef(e.target.value)}
              className="border px-4 py-2 rounded w-96"
            />
            <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-1 -top-8">
              Référence au format : FIT2025-xxxxx
            </span>
          </div>
          <button
            onClick={importerFiche}
            disabled={loadingImport}
            className="bg-[#1a5c97] hover:bg-[#14497a] text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
          >
            {loadingImport ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
                </svg>
                Importation...
              </>
            ) : (
              "Importer"
            )}
          </button>
          {message && <span className="text-sm text-gray-600">{message}</span>}
        </div>

        {fiches.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold text-[#1a5c97] mb-3">Fiches d'intervention importées</h2>
            <div className="flex flex-wrap gap-2">
              {fiches.map((fiche, index) => (
                <span key={index} className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                  {fiche}
                </span>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xl font-semibold text-[#1a5c97] mt-8 mb-3">
          Prestations ({prestations.filter((p) => p.est_validee).length}/{prestations.length})
        </h2>
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3 border-b">Référence</th>
              <th className="p-3 border-b">Désignation</th>
              <th className="p-3 border-b text-center">Validée</th>
            </tr>
          </thead>
          <tbody>
            {prestations.map((p) => (
              <tr key={p.id} className={p.est_validee ? "bg-green-50" : "bg-gray-50"}>
                <td className="p-3 border-b">{p.reference}</td>
                <td className="p-3 border-b">{p.description}</td>
                <td className="p-3 border-b text-center">
                  <input
                    type="checkbox"
                    checked={p.est_validee}
                    onChange={(e) => handleCheckPrestation(p.id, e.target.checked)}
                    disabled={role !== "admin"}
                    className="h-5 w-5"
                  />
                  {!p.est_validee && <span className="ml-2 text-gray-500"></span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-xl font-semibold text-[#1a5c97] mt-8 mb-3">
          Pièces ({pieces.filter((p) => p.est_livree).length}/{pieces.length})
        </h2>
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3 border-b">Référence</th>
              <th className="p-3 border-b">Désignation</th>
              <th className="p-3 border-b text-center">Quantité</th>
              <th className="p-3 border-b text-center">Livrée</th>
            </tr>
          </thead>
          <tbody>
            {pieces.map((p) => (
              <tr key={p.id} className={p.est_livree ? "bg-green-50" : "bg-gray-50"}>
                <td className="p-3 border-b">{p.reference}</td>
                <td className="p-3 border-b">{p.designation}</td>
                <td className="p-3 border-b text-center">{p.quantite}</td>
                <td className="p-3 border-b text-center">
                  <input
                    type="checkbox"
                    checked={p.est_livree}
                    onChange={(e) => handleCheckPiece(p.id, e.target.checked)}
                    disabled={role !== "admin"}
                    className="h-5 w-5"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!toutesValidees && (
          <div className="text-red-500 text-sm mb-6 text-center">
            Veuillez valider toutes les prestations et livrer toutes les pièces avant de continuer.
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            disabled={!toutesValidees}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 text-lg font-semibold disabled:opacity-50"
          >
            Passer à l'état suivante
          </button>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
              <h3 className="text-lg font-semibold mb-6">
                Êtes-vous sûr de vouloir marquer ce camion comme prêt à livrer ?
              </h3>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                >
                  Annuler
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={loadingStatus}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  {loadingStatus ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
                      </svg>
                      Mise à jour...
                    </>
                  ) : (
                    "Confirmer"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
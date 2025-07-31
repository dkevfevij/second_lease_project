import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";

interface Camion {
  id?: number;
  statut: string;
  immatriculation_etrangere: string;
  marque: string;
  modele: string;
  kilometrage: number;
  date_mise_en_circulation: string;
  client?: string;
  inspection_reception: string;
  date_creation?: string;
  date_statut_en_cours?: string;
  retour_arriere?: boolean;
  date_livraison?: string;
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

function formatDateFr(dateStr?: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR"); // Format court FR : jj/mm/aaaa
}

export default function EnCoursCamion() {
  const { chassis } = useParams();
  const [camion, setCamion] = useState<Camion | null>(null);
  const [ficheRef, setFicheRef] = useState("");
  const [message, setMessage] = useState("");
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [fiches, setFiches] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showRetourModal, setShowRetourModal] = useState(false);
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

  const showAlerteRetard = () => {
    if (camion?.statut !== "en_cours" || !camion.date_statut_en_cours) return false;

    const dateDebut = new Date(camion.date_statut_en_cours);
    const now = new Date();
    const diffJours = (now.getTime() - dateDebut.getTime()) / (1000 * 3600 * 24);

    const prestationsIncompletes = prestations.some(p => !p.est_validee);
    const piecesIncompletes = pieces.some(p => !p.est_livree);

    return diffJours > 7 && (prestationsIncompletes || piecesIncompletes);
  };
  const [alerteRetard, setAlerteRetard] = useState(false);

  const [reminders, setReminders] = useState<any | null>(null);
  const [comment, setComment] = useState("");
  const [activeReminders, setActiveReminders] = useState<string[]>([]);

  const fetchReminders = async () => {
    if (!chassis || !token || camion?.statut !== "pret_a_livrer") return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/camions/${chassis}/reminders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReminders(res.data);

      const actifs = Object.entries(res.data)
        .filter(([_, val]: any) => val.rappel === true)
        .map(([type]) => type);

      setActiveReminders(actifs);
    } catch (err) {
      console.error("Erreur chargement reminders:", err);
    }
  };

  useEffect(() => {
    if (camion?.statut === "pret_a_livrer") {
      fetchReminders();
    }

    const interval = setInterval(() => {
      if (camion?.statut === "pret_a_livrer") {
        fetchReminders();
      }
    }, 300000);

    return () => clearInterval(interval);
  }, [camion?.statut]);

  const validerReminder = async (type: string) => {
    if (!chassis || !token) return;

    try {
      await axios.post(`${API_BASE_URL}/api/reminders/valider`, {
        numero_chassis: chassis,
        type,
        commentaire: comment,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMessage(`Rappel "${type.replace("_", " ")}" validé avec succès`);
      setComment("");

      const res = await axios.get(`${API_BASE_URL}/api/camions/${chassis}/reminders`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setReminders(res.data);

      const nouveaux = Object.entries(res.data)
        .filter(([_, val]: any) => val.rappel === true)
        .map(([key]) => key);

      setActiveReminders(nouveaux);
    } catch (err: any) {
      console.error("Erreur validation reminder:", err.response?.data || err.message);
      setMessage("❌ Erreur lors de la validation");
    }
  };

  const fetchAlerteRetard = async () => {
    if (!chassis || !token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/camions/${chassis}/alerte`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.alerte === true) {
        setAlerteRetard(true);
      } else {
        setAlerteRetard(false);
      }
    } catch (err) {
      console.error("Erreur alerte retard:", err);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Erreur téléchargement:", error);
    }
  };

  const fetchCamionData = async () => {
    if (!token || !chassis) return;

    try {
      const camionRes = await axios.get(`${API_BASE_URL}/api/camions/${chassis}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = camionRes.data;
      setCamion({
        ...data,
        statut: data.statut ? data.statut.toLowerCase() : "en_attente",
      });

      const elementsRes = await axios.get(
        `${API_BASE_URL}/api/camions/${chassis}/elements_fiche`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPrestations(elementsRes.data.prestations || []);
      setPieces(elementsRes.data.pieces || []);
      setFiches(elementsRes.data.fiches || []);

      try {
        const photoRes = await axios.get(
          `${API_BASE_URL}/api/photos/chassis/${chassis}/photos`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("Photo response:", photoRes.data);
        setPhotos(photoRes.data.photos || []);
      } catch (e) {
        console.error("Erreur chargement photos:", e);
      }
    } catch (err) {
      console.error("Erreur chargement données camion et fiche", err);
    }
  };

  useEffect(() => {
    fetchCamionData();
    fetchAlerteRetard();
  }, [token]);

  const importerFiche = async () => {
    if (!ficheRef.match(/^FIT\d{4}-\d{5}$/)) {
      setMessage("Référence invalide. Numéro de chassis différent");
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
      setCamion((prev) => (prev ? { ...prev, statut: "en_cours" } : prev));
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

  const handleRetourEnArriere = async () => {
    setLoadingStatus(true);
    try {
      await axios.patch(
        `${API_BASE_URL}/api/camions/${chassis}/changer-statut`,
        { nouveau_statut: "en_cours" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Statut mis à jour avec succès ✅");
      await fetchCamionData();
    } catch (err) {
      console.error("Erreur retour en arrière", err);
      setMessage("Erreur lors du retour en arrière");
    } finally {
      setLoadingStatus(false);
      setShowRetourModal(false);
    }
  };

 const handleStatusToLivree = async () => {
  setLoadingStatus(true);
  setMessage(""); // vide le message avant action

  try {
    const response = await axios.patch(
      `${API_BASE_URL}/api/camions/${chassis}/changer-statut`,
      { nouveau_statut: "livree" },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("✅ Réponse backend :", response.data);

    setMessage("Statut mis à jour à 'Livrée' avec succès 🎉");
    await fetchCamionData(); // recharge les données avec le nouveau statut
  } catch (e: any) {
    console.error("❌ Erreur changement statut :", e?.response?.data || e.message);
    setMessage(e?.response?.data?.error || "Erreur lors de la mise à jour du statut");
  } finally {
    setLoadingStatus(false);
  }
};


  const generateReport = async () => {
    if (!token || !chassis) return;
    setLoadingReport(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/camions/${chassis}/rapport-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_${chassis}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur génération rapport PDF:", err);
    } finally {
      setLoadingReport(false);
    }
  };

  const toutesValidees = prestations.every((p) => p.est_validee) && pieces.every((p) => p.est_livree);
  const statutColor = {
  en_attente: "bg-[#fef2f2] text-[#b91c1c] border border-[#fca5a5]",       // rouge pâle élégant
  en_cours: "bg-[#fff7ed] text-[#c2410c] border border-[#fdba74]",        // orange subtil et pro
  pret_a_livrer: "bg-[#eef2ff] text-[#4338ca] border border-[#a5b4fc]",   // vert clair pastel
  livree: "bg-[#ecfdf5] text-[#047857] border border-[#6ee7b7]",          // bleu doux et lisible
};

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
          className="text-base text-red-600 hover:underline flex items-center gap-2"
        >
          <span></span> Se déconnecter
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
            {["en_cours", "pret_a_livrer", "livree"].includes(camion?.statut || "") && (
            <button onClick={generateReport}
                disabled={loadingReport}
                className="bg-[#1a5c97] hover:bg-[#14497a] text-white px-4 py-2 rounded-lg shadow-md hover:from-blue-700 hover:to-blue-800 transition duration-300 text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {loadingReport ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
                    </svg>
                    Génération...
                  </>
                ) : (
                  <>
                    <span></span> Générer Rapport
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {alerteRetard && (
          <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white px-6 py-4 rounded-lg shadow-xl mb-6 animate-pulse flex items-center gap-4 border-l-8 border-white">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-wider">Alerte critique</h3>
              <p className="text-sm font-medium">
                Ce camion est en cours depuis plusieurs jours sans validation complète. Veuillez agir immédiatement.
              </p>
            </div>
          </div>
        )}
        {camion?.statut === "pret_a_livrer" && activeReminders.length > 0 && (
          <div className="space-y-4 mb-6">
            {activeReminders.map((reminderType) => (
              <div
                key={reminderType}
                className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-5 rounded-lg shadow-lg transform transition-all duration-300 hover:shadow-xl animate-fade-in"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <svg
                      className="w-6 h-6 text-amber-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-md font-semibold uppercase tracking-wide">Rappel en attente</h3>
                    <p className="text-sm text-amber-800 mt-1">
                      Un contrôle périodique de type <span className="font-medium">{reminderType.replace("_", " ")}</span> nécessite
                      votre validation.
                    </p>
                    {role === "admin" && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Ajouter un commentaire (facultatif)"
                          className="w-full p-2 border border-amber-200 rounded-md focus:ring-2 focus:ring-amber-300 focus:border-amber-300 text-sm resize-y transition-all"
                          rows={2}
                        />
                        <button
                          type="button"
                          onClick={() => validerReminder(reminderType)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-md shadow-md hover:shadow-lg transition-all duration-200 text-sm font-medium flex items-center gap-1"
                        >
                          <span></span> Valider
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
       {camion && (
  <div className="bg-white p-6 rounded-lg shadow mb-6 grid grid-cols-2 gap-6">
    <div>
      <strong>Immatriculation :</strong> {camion.immatriculation_etrangere}
    </div>
     <div>
      <strong>Date de mise en circulation :</strong> {formatDateFr(camion.date_mise_en_circulation)}
    </div>
    <div>
      <strong>Marque :</strong> {camion.marque}
    </div>
    <div>
      <strong>Date d'enregistrement :</strong> {formatDateFr(camion.date_creation)}
    </div>
    <div>
      <strong>Modèle :</strong> {camion.modele}
    </div>
    {camion.date_statut_en_cours && (
      <div>
       <strong>Début des interventions :</strong> {formatDateFr(camion.date_statut_en_cours)}
      </div>
    )}
    <div>
      <strong>Client :</strong> {camion.client || "N/A"}
    </div>
    {camion.statut === "livree" && camion.date_livraison && (
      <div>
        <strong>Date de livraison :</strong> {formatDateFr(camion.date_livraison)}
      </div>
    )}
    <div>
      <strong>Kilométrage :</strong> {camion.kilometrage} km
    </div>
    <div className="col-span-2">
      <strong>Inspection :</strong>{" "}
      {camion.inspection_reception ? camion.inspection_reception : (
        <span className="text-red-500">⚠️ Contrôle manquant</span>
      )}
    </div>
  </div>
)}

        {photos.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-3 text-[#1a5c97]">Photos du camion</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`Camion ${idx + 1}`}
                  className="w-full h-40 object-cover rounded shadow cursor-pointer hover:opacity-80 hover:scale-105 transition-transform duration-200"
                  title="Cliquez pour télécharger"
                  onClick={() => handleDownload(url, `photo_camion_${idx + 1}.jpg`)}
                />
              ))}
            </div>
          </div>
        )}

        {(camion?.statut === "en_cours" || camion?.statut === "en_attente") && role === "admin" && (
          <div className="flex items-center gap-3 mb-6 relative">
            <div className="group">
              <input
                type="text"
                placeholder="Réf Fiche"
                value={ficheRef}
                onChange={(e) => setFicheRef(e.target.value)}
                className="border px-4 py-2 rounded w-96"
              />
              <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-1 -top-8">
               
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
        )}

        {camion?.statut !== "en_attente" && (
          <>
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
                        disabled={role !== "admin" || camion?.statut !== "en_cours"}
                        onChange={(e) => handleCheckPrestation(p.id, e.target.checked)}
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
                        disabled={role !== "admin" || camion?.statut !== "en_cours"}
                        onChange={(e) => handleCheckPiece(p.id, e.target.checked)}
                        className="h-5 w-5"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {camion?.statut === "en_cours" && !toutesValidees && (
          <div className="text-red-500 text-sm mb-6 text-center">
            Veuillez valider toutes les prestations et livrer toutes les pièces avant de continuer.
          </div>
        )}

        {camion?.statut === "en_cours" && role === "admin" && (
          <div className="flex justify-end gap-6">
            <button
              onClick={() => setShowModal(true)}
              disabled={!toutesValidees}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg shadow-md hover:from-green-700 hover:to-green-800 transition duration-300 text-lg font-semibold transform hover:-translate-y-1 disabled:opacity-50"
            >
              Passer à l'état suivant
            </button>
          </div>
        )}

        {camion?.statut === "pret_a_livrer" && role === "admin" && (
          <div className="flex justify-end gap-6">
            <button
              onClick={() => setShowRetourModal(true)}
              className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-lg shadow-md hover:from-red-600 hover:to-red-700 transition duration-300 text-lg font-semibold transform hover:-translate-y-1 flex items-center gap-2"
            >
              <span></span> Retour à l'état "En cours"
            </button>
            <button
              onClick={handleStatusToLivree}
              disabled={loadingStatus}
              className="bg-gradient-to-r from-emerald-500 to-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg hover:from-emerald-600 hover:to-yellow-600 transition-all duration-300 text-xl font-bold transform hover:-translate-y-1 hover:scale-110 flex items-center gap-2 disabled:opacity-50"
            >
              {loadingStatus ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
                  </svg>
                  Chargement...
                </>
              ) : (
                <>
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 10l5 5 5-5"
                    />
                  </svg>
                  Marquer comme Livrée
                </>
              )}
            </button>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full border border-gray-200 transform transition-all duration-300 scale-100">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                Confirmer le passage à "Prêt à livrer"
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Êtes-vous sûr de vouloir marquer ce camion comme prêt à livrer ?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200 font-medium"
                >
                  Annuler
                </button>
                {camion?.statut === "pret_a_livrer" && activeReminders.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {activeReminders.map((reminderType) => (
                      <div
                        key={reminderType}
                        className="bg-yellow-100 border-l-8 border-yellow-500 text-yellow-900 p-6 rounded-lg shadow-md animate-pulse"
                      >
                        <div className="flex items-start gap-4">
                          <div className="text-3xl">🔔</div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold uppercase">Rappel à valider</h3>
                            <p className="text-sm mb-2">
                              Un contrôle périodique de type <strong>{reminderType.replace("_", " ")}</strong> est en attente de validation.
                            </p>
                            {role === "admin" && (
                              <>
                                <textarea
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  placeholder="Ajouter un commentaire (facultatif)"
                                  className="w-full p-2 border rounded mb-2 text-sm"
                                  rows={2}
                                />
                                <button
                                  type="button"
                                  onClick={() => validerReminder(reminderType)}
                                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow text-sm"
                                >
                                  Valider ce rappel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleStatusChange}
                  disabled={loadingStatus}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 font-medium flex items-center gap-2 disabled:opacity-50"
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

        {showRetourModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full border border-gray-200 transform transition-all duration-300 scale-100">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                Confirmer le retour à "En cours"
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Êtes-vous sûr de vouloir revenir à l'état "En cours" ?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowRetourModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRetourEnArriere}
                  disabled={loadingStatus}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200 font-medium flex items-center gap-2 disabled:opacity-50"
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
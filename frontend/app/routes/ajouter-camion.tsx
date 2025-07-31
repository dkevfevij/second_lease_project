import { useState, useRef } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useNavigate, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

interface CamionData {
  numero_chassis: string;
  immatriculation_etrangere: string;
  marque: string;
  modele: string;
  kilometrage: number;
  date_mise_en_circulation: string;
  client?: string;
  inspection_reception: string;
  memos?: string;
  statut?: string; // Added for status bubble
}

export default function AjouterCamion() {
  const [formData, setFormData] = useState<CamionData>({
    numero_chassis: "",
    immatriculation_etrangere: "",
    marque: "",
    modele: "",
    kilometrage: 0,
    date_mise_en_circulation: "",
    client: "",
    inspection_reception: "",
    memos: "",
    statut: "", // Default empty status
  });

  const [searchNumero, setSearchNumero] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [locked, setLocked] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const MAX_FILES = 10;
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [loadingUpdate, setLoadingUpdate] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [initialNumero, setInitialNumero] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "number" ? parseInt(value) || 0 : value,
      }));
    }
  };

  const handleSearch = async () => {
    setLoadingSearch(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/camions/${searchNumero}/edition`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data) {
        setFormData(res.data);
        setInitialNumero(res.data.numero_chassis);
        setLocked(false);
        toast.success("Camion trouvé");
      } else {
        toast.error("Camion introuvable");
        setLocked(true);
        resetForm();
      }
    } catch (err) {
      toast.error(" Erreur lors de la recherche");
      setLocked(true);
    } finally {
      setLoadingSearch(false);
    }
  };

  const checkNumeroExist = async (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (!value) {
      setLocked(true);
      setFormData((prev) => ({ ...prev, numero_chassis: "" }));
      return;
    }

    try {
      const res = await axios.get(`${API_BASE_URL}/api/camions/liste_complets`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const camions = Array.isArray(res.data) ? res.data : [];
      const existe = camions.some((c: { numero_chassis: string }) => c.numero_chassis === value);

      if (existe) {
        toast.error("Ce numéro de châssis existe déjà.");
        setLocked(true);
        setFormData((prev) => ({ ...prev, numero_chassis: "" }));
        setInitialNumero(null);
      } else {
        toast.success(" Vous pouvez continuer.");
        setLocked(false);
        setFormData((prev) => ({ ...prev, numero_chassis: value }));
      }
    } catch (err: any) {
      console.error("Erreur API:", err);
      toast.error(
        err?.response?.status === 404
          ? "❌ Endpoint introuvable. Vérifiez l'URL API."
          : err?.response?.status === 401
          ? "❌ Authentification échouée. Vérifiez votre token."
          : "❌ Erreur réseau ou serveur. Contactez le support."
      );
      setLocked(true);
      setFormData((prev) => ({ ...prev, numero_chassis: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoadingSubmit(true);
    try {
      const submitData = { ...formData };
      delete submitData.statut; // Remove statut if backend doesn't expect it
      console.log("Submit Payload:", submitData); // Debug payload
      await axios.post(`${API_BASE_URL}/api/camions/add`, submitData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await uploadPhotos(formData.numero_chassis);
      toast.success("Camion ajouté");
      resetForm();
    } catch (err: any) {
      console.error("Submit Error:", err.response?.data || err.message);
      toast.error(err.response?.data?.error?.includes("duplicate key") ? " Numéro déjà existant" : " Erreur d'envoi");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm() || !initialNumero) {
      toast.error(" Impossible de modifier : numéro d'origine introuvable");
      return;
    }
    setLoadingUpdate(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/api/camions/${initialNumero}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await uploadPhotos(formData.numero_chassis);
      setInitialNumero(formData.numero_chassis); // Update to new numero_chassis if successful
      toast.success("Camion mis à jour");
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.error || "Erreur lors de la mise à jour";
      toast.error(` ${errorMsg.includes("duplicate key") ? "Numéro déjà existant" : errorMsg}`);
    } finally {
      setLoadingUpdate(false);
    }
  };

  const handleDelete = async () => {
    if (!formData.numero_chassis) return;
    if (!window.confirm("Voulez-vous vraiment supprimer ce camion ? Cette action est définitive.")) {
      toast(" Suppression annulée", { icon: "⚠️" });
      return;
    }
    setLoadingDelete(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/camions/${formData.numero_chassis}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      resetForm();
      toast.success(" Camion supprimé");
    } catch (err) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setLoadingDelete(false);
    }
  };

  const resetForm = () => {
    setFormData({
      numero_chassis: "",
      immatriculation_etrangere: "",
      marque: "",
      modele: "",
      kilometrage: 0,
      date_mise_en_circulation: "",
      client: "",
      inspection_reception: "",
      memos: "",
      statut: "", // Reset statut
    });
    setInitialNumero(null);
    setFiles([]);
    setPreviews([]);
    setLocked(true);
  };

  const validateForm = () => {
    const required = [
      "numero_chassis",
      "immatriculation_etrangere",
      "marque",
      "modele",
      "kilometrage",
      "date_mise_en_circulation",
      "inspection_reception",
    ];
    for (let field of required) {
      if (!formData[field as keyof CamionData]) {
        toast.error(` Champ manquant : ${field.replace(/_/g, " ")}`);
        return false;
      }
    }
    if (formData.kilometrage < 0) {
      toast.error("Le kilométrage ne peut pas être négatif");
      return false;
    }
    return true;
  };

  const uploadPhotos = async (numero_chassis: string) => {
    if (!files.length) return;
    const names: string[] = [];
    for (let file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(` ${file.name} dépasse 10MB`);
        continue;
      }
      const form = new FormData();
      form.append("file", file);
      form.append("numero_chassis", numero_chassis);
      try {
        const res = await axios.post(`${API_BASE_URL}/api/photos/upload`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        names.push(res.data.file_name);
      } catch {
        toast.error("Erreur upload photo");
      }
    }
    setUploaded(names);
    setFiles([]);
    setPreviews([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > MAX_FILES) {
      toast.error(`Limite de ${MAX_FILES} fichiers atteinte`);
      return;
    }
    const validFiles = selectedFiles.filter(file => file.size <= MAX_FILE_SIZE);
    if (validFiles.length < selectedFiles.length) {
      toast.error(" Certains fichiers dépassent 10MB");
    }
    setFiles(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between">
        <div>
          <img src="/logo2.png" alt="Bonne Route Auto" className="h-24 mb-4" />
          <nav className="space-y-3 text-base">
            {[
              { icon: "", label: "Dashboard", path: "/dashboard" },
              { icon: "", label: "Ajouter Camions", path: "/ajouter-camion" },
              { icon: "", label: "Utilisateurs", path: "/ListeUtilisateurs" },
              
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
          <span></span> Se déconnecter
        </button>
      </aside>

      <main className="flex-1 p-8 bg-gray-50">
        <Toaster position="top-right" />
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-500"> {formData.numero_chassis || "N/A"}</h2>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm px-4 py-1 rounded-full ${
                  statutColor[formData.statut as keyof typeof statutColor] || "bg-gray-100"
                }`}
              >
                {formData.statut?.replace("_", " ") || "Non défini"}
              </span>
              <button className="text-gray-500 hover:text-gray-700" onClick={handleSearch}></button>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-[#1a5c97] mb-6 text-center">Enregistrer un camion</h2>

          <div className="flex items-center mb-6 space-x-4">
            <input
              type="text"
              placeholder="Rechercher un N° de châssis existant"
              value={searchNumero}
              onChange={(e) => setSearchNumero(e.target.value)}
              className="border px-4 py-2 rounded w-full"
            />
            <button
              onClick={handleSearch}
              disabled={loadingSearch}
              className="bg-[#1a5c97] hover:bg-[#14497a] text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              {loadingSearch ? "Recherche..." : "Rechercher"}
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau N° de châssis</label>
            <input
              type="text"
              placeholder="Ex: XLR123456789"
              value={formData.numero_chassis}
              name="numero_chassis"
              onChange={handleChange}
              onBlur={checkNumeroExist}
              className="border px-4 py-2 rounded w-full"
              disabled={loadingSearch || loadingSubmit || loadingUpdate}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {Object.entries(formData).map(([key, value]) => (
              key !== "numero_chassis" && key !== "statut" && (
                <div key={key} className="col-span-1">
                  <label className="block mb-1 text-sm font-medium capitalize">
                    {key.replace(/_/g, " ")}
                  </label>
                  {key === "inspection_reception" || key === "memos" ? (
                    <textarea
                      name={key}
                      value={value ?? ""}
                      onChange={handleChange}
                      disabled={locked || loadingSearch || loadingSubmit || loadingUpdate}
                      className="w-full border rounded px-4 py-2"
                    />
                  ) : (
                    <input
                      name={key}
                      value={value ?? ""}
                      onChange={handleChange}
                      disabled={locked || loadingSearch || loadingSubmit || loadingUpdate}
                      type={
                        key === "kilometrage" ? "number"
                          : key.includes("date") ? "date"
                          : "text"
                      }
                      className="w-full border rounded px-4 py-2"
                      min={key === "kilometrage" ? "0" : undefined}
                    />
                  )}
                </div>
              )
            ))}
          </div>

          <div className="mt-6">
            <label className="block mb-2 text-sm font-medium text-gray-700">Uploader des photos</label>
            <div className="flex gap-4 items-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                type="button"
                disabled={files.length >= MAX_FILES || loadingSubmit || loadingUpdate}
                className="bg-[#1a5c97] hover:bg-[#14497a] text-white px-4 py-2 rounded disabled:bg-gray-400"
              >
                + Ajouter
              </button>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                disabled={files.length >= MAX_FILES || loadingSubmit || loadingUpdate}
              />
            </div>

            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {previews.map((src, index) => (
                  <div key={index} className="relative">
                    <img
                      src={src}
                      alt={`preview-${index}`}
                      className="h-24 w-24 object-cover border rounded shadow"
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-0 right-0 bg-red-600 text-white text-xs px-1 rounded-full"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-4 mt-6 justify-end">
            <button
              onClick={handleSubmit}
              disabled={locked || loadingSubmit || !formData.numero_chassis}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 disabled:opacity-50"
            >
              {loadingSubmit ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
                  </svg> Ajout...
                </>
              ) : ("Ajouter")}
            </button>
            <button
              onClick={handleUpdate}
              disabled={locked || loadingUpdate || !initialNumero}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow flex items-center gap-2 disabled:opacity-50"
            >
              {loadingUpdate ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
                  </svg> Mise à jour...
                </>
              ) : ("Modifier")}
            </button>
            <button
              onClick={handleDelete}
              disabled={locked || loadingDelete || !formData.numero_chassis}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 disabled:opacity-50"
            >
              {loadingDelete ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
                  </svg> Suppression...
                </>
              ) : ("Supprimer")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const statutColor = {
  en_attente: "bg-[#fef2f2] text-[#b91c1c] border border-[#fca5a5]",       // rouge pâle élégant
  en_cours: "bg-[#fff7ed] text-[#c2410c] border border-[#fdba74]",        // orange subtil et pro
  pret_a_livrer: "bg-[#ecfdf5] text-[#047857] border border-[#6ee7b7]",   // vert clair pastel
  livree: "bg-[#eef2ff] text-[#4338ca] border border-[#a5b4fc]",          // bleu doux et lisible
};
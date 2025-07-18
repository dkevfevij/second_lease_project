import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import { useNavigate } from "react-router-dom";
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
  });

  const [searchNumero, setSearchNumero] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [locked, setLocked] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const selectedFiles = Array.from(selected);
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`❌ ${file.name} dépasse 5MB`);
        return false;
      }
      return true;
    });

    if (files.length + validFiles.length > MAX_FILES) {
      toast.error(`❌ Maximum ${MAX_FILES} fichiers`);
      return;
    }

    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
    setFiles((prev) => [...prev, ...validFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    const newFiles = [...files];
    const newPreviews = [...previews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setFiles(newFiles);
    setPreviews(newPreviews);
  };

  const checkNumeroExist = async () => {
    const numero = formData.numero_chassis.trim();
    if (!numero) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/api/camions/${numero}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data && res.data.numero_chassis) {
        toast.error("🚫 Ce numéro de châssis existe déjà !");
        setFormData((prev) => ({ ...prev, numero_chassis: "" }));
        setLocked(true);
      } else {
        setLocked(false);
      }
    } catch {
      setLocked(false);
    }
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/camions/${searchNumero}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data) {
        setFormData(res.data);
        setLocked(false);
        toast.success("✅ Camion trouvé");
      } else {
        toast.error("❌ Camion introuvable");
      }
    } catch {
      toast.error("❌ Erreur lors de la recherche");
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      await axios.post(`${API_BASE_URL}/api/camions/add`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await uploadPhotos(formData.numero_chassis);
      toast.success("✅ Camion ajouté");
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
      });
      setFiles([]);
      setPreviews([]);
      setLocked(true);
    } catch (err: any) {
      if (err.response?.data?.error?.includes("duplicate key")) {
        toast.error("❌ Numéro déjà existant");
      } else {
        toast.error("❌ Erreur d'envoi");
      }
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    try {
      await axios.put(`${API_BASE_URL}/api/camions/${formData.numero_chassis}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await uploadPhotos(formData.numero_chassis);
      toast.success("✏️ Camion mis à jour");
    } catch {
      toast.error("❌ Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_BASE_URL}/api/camions/${formData.numero_chassis}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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
      });
      setFiles([]);
      setPreviews([]);
      setLocked(true);
      toast.success("🗑️ Camion supprimé");
    } catch {
      toast.error("❌ Erreur lors de la suppression");
    }
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
        toast.error(`❌ Champ manquant : ${field.replace(/_/g, " ")}`);
        return false;
      }
    }
    return true;
  };

  const uploadPhotos = async (numero_chassis: string) => {
    if (!files.length) return;
    const names: string[] = [];

    for (let file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("numero_chassis", numero_chassis);

      try {
        const res = await axios.post(`${API_BASE_URL}/api/photos/upload`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
        names.push(res.data.file_name);
      } catch {
        toast.error("❌ Erreur upload photo");
      }
    }

    setUploaded(names);
    setFiles([]);
    setPreviews([]);
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
        {typeof window !== "undefined" && <Toaster position="top-right" />}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1a5c97] mb-6 text-center">Ajouter / Modifier un camion</h2>

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
              className="bg-[#1a5c97] hover:bg-[#14497a] text-white px-4 py-2 rounded"
            >
              Rechercher
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
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {Object.entries(formData).map(([key, value]) => (
              key !== "numero_chassis" && (
                <div key={key} className="col-span-1">
                  <label className="block mb-1 text-sm font-medium capitalize">
                    {key.replace(/_/g, " ")}
                  </label>
                  {key === "inspection_reception" || key === "memos" ? (
                    <textarea
                      name={key}
                      value={value ?? ""}
                      onChange={handleChange}
                      disabled={locked}
                      className="w-full border rounded px-4 py-2"
                    />
                  ) : (
                    <input
                      name={key}
                      value={value ?? ""}
                      onChange={handleChange}
                      disabled={locked}
                      type={
                        key === "kilometrage" ? "number"
                          : key.includes("date") ? "date"
                          : "text"
                      }
                      className="w-full border rounded px-4 py-2"
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
                className="bg-[#1a5c97] hover:bg-[#14497a] text-white px-4 py-2 rounded"
              >
                + Ajouter
              </button>
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
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
              disabled={locked}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow disabled:opacity-50"
            >
              Ajouter
            </button>
            <button
              onClick={handleUpdate}
              disabled={locked}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded shadow disabled:opacity-50"
            >
              Modifier
            </button>
            <button
              onClick={handleDelete}
              disabled={locked}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow disabled:opacity-50"
            >
              Supprimer
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
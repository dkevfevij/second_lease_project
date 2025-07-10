import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import Layout from "../../components/Layout";

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

  const [result, setResult] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [locked, setLocked] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILES = 5;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const checkNumeroExist = async () => {
    const numero = formData.numero_chassis.trim();
    if (!numero) return;

    try {
      const res = await axios.get(`${API_BASE_URL}/api/camions/${numero}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data && res.data.numero_chassis) {
        alert("🚫 Ce numéro de châssis existe déjà !");
        setFormData((prev) => ({ ...prev, numero_chassis: "" }));
        setLocked(true);
      } else {
        setLocked(false);
      }
    } catch {
      setLocked(false); // autoriser la suite si inexistant
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const selectedFiles = Array.from(selected);
    const validFiles = selectedFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`❌ ${file.name} dépasse 5MB`);
        return false;
      }
      return true;
    });

    if (files.length + validFiles.length > MAX_FILES) {
      alert(`❌ Maximum ${MAX_FILES} fichiers`);
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

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [previews]);

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
      } catch (err) {
        console.error("Erreur upload:", err);
      }
    }

    setUploaded(names);
  };

  const validateForm = () => {
    const required = [
      "numero_chassis", "immatriculation_etrangere", "marque",
      "modele", "kilometrage", "date_mise_en_circulation", "inspection_reception"
    ];

    for (let field of required) {
      if (!formData[field as keyof CamionData]) {
        setResult(`❌ Champ manquant : ${field.replace(/_/g, " ")}`);
        return false;
      }
    }
    return true;
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/camions/${formData.numero_chassis}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data) {
        setFormData(res.data);
        setLocked(false);
        setResult("✅ Camion trouvé");
      } else {
        setResult("❌ Camion introuvable");
      }
    } catch {
      setResult("❌ Erreur lors de la recherche");
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      await axios.post(`${API_BASE_URL}/api/camions/add`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await uploadPhotos(formData.numero_chassis);
      setResult("✅ Camion ajouté");
    } catch (err: any) {
      if (err.response?.data?.error?.includes("duplicate key")) {
        setResult("❌ Numéro déjà existant");
      } else {
        setResult("❌ Erreur d'envoi");
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
      setResult("✏️ Camion mis à jour");
    } catch {
      setResult("❌ Erreur lors de la mise à jour");
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

      setLocked(true);
      setResult("🗑️ Camion supprimé");
    } catch {
      setResult("❌ Erreur lors de la suppression");
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-blue-800 mb-6 text-center">Ajouter / Modifier un camion</h2>

        <div className="flex items-center mb-6 space-x-4">
          <input
            type="text"
            placeholder="Entrer un N° de châssis"
            value={formData.numero_chassis}
            name="numero_chassis"
            onBlur={checkNumeroExist}
            onChange={handleChange}
            className="border px-3 py-2 rounded w-full"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Rechercher
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
                    className="w-full border rounded px-3 py-2"
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
                    className="w-full border rounded px-3 py-2"
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
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

        <div className="flex space-x-4 mt-6">
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

        {result && <p className="mt-4 font-medium text-center text-sm text-gray-800">{result}</p>}
      </div>
    </Layout>
  );
}

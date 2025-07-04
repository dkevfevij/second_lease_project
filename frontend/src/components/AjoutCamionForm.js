// src/components/AjoutCamionForm.js

import React, { useState } from "react";
import { ajouterCamion } from "../services/api";
import "../styles/main.css";

const AjoutCamionForm = () => {
  const [formData, setFormData] = useState({
    numero_chassis: "",
    immatriculation_etrangere: "",
    marque: "",
    modele: "",
    kilometrage: "",
    date_mise_en_circulation: "",
    client: "",
    inspection_reception: "",
    memos: "",
    photos_url: "",
  });

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await ajouterCamion(formData);
      setSuccess(true);
      setError("");
      setFormData({
        numero_chassis: "",
        immatriculation_etrangere: "",
        marque: "",
        modele: "",
        kilometrage: "",
        date_mise_en_circulation: "",
        client: "",
        inspection_reception: "",
        memos: "",
        photos_url: "",
      });
    } catch (err) {
      setError("Erreur lors de l'ajout du camion.");
      setSuccess(false);
    }
  };

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <h2>Ajouter un camion</h2>

      <input name="numero_chassis" placeholder="N° de châssis *" required value={formData.numero_chassis} onChange={handleChange} />
      <input name="immatriculation_etrangere" placeholder="Immatriculation étrangère *" required value={formData.immatriculation_etrangere} onChange={handleChange} />
      <input name="marque" placeholder="Marque *" required value={formData.marque} onChange={handleChange} />
      <input name="modele" placeholder="Modèle *" required value={formData.modele} onChange={handleChange} />
      <input name="kilometrage" type="number" placeholder="Kilométrage *" required value={formData.kilometrage} onChange={handleChange} />
      <input name="date_mise_en_circulation" type="date" placeholder="Date de 1ère mise en circulation *" required value={formData.date_mise_en_circulation} onChange={handleChange} />
      <input name="client" placeholder="Client" value={formData.client} onChange={handleChange} />
      <textarea name="inspection_reception" placeholder="Inspection à la réception *" required value={formData.inspection_reception} onChange={handleChange}></textarea>
      <textarea name="memos" placeholder="Mémos" value={formData.memos} onChange={handleChange}></textarea>
      <input name="photos_url" placeholder="Lien photo *" required value={formData.photos_url} onChange={handleChange} />

      <button type="submit">Ajouter</button>

      {success && <p className="success-msg">✅ Camion ajouté avec succès !</p>}
      {error && <p className="error-msg">❌ {error}</p>}
    </form>
  );
};

export default AjoutCamionForm;

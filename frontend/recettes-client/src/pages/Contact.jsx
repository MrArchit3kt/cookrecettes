// src/pages/Contact.jsx
import React, { useState } from 'react';
import api from '../api';

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    agree: false,
    // honeypot anti-spam (champ caché)
    website: '',
  });

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNews, setSubmittingNews] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  function upd(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.agree) return alert('Merci d’accepter la politique de confidentialité.');
    if (form.website) return; // bot détecté
    try {
      setSending(true);
      await api.post('/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '', agree: false, website: '' });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Envoi impossible pour le moment.');
    } finally {
      setSending(false);
    }
  }

  async function onSubscribe(e) {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    try {
      setSubmittingNews(true);
      await api.post('/newsletter/subscribe', { email: newsletterEmail.trim() });
      setSubscribed(true);
      setNewsletterEmail('');
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.error || 'Abonnement impossible pour le moment.');
    } finally {
      setSubmittingNews(false);
    }
  }

  return (
    <>
      {/* ===== HERO ===== */}
      <section
        className="round-xl mb-4 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,.08), rgba(59,130,246,.08))',
          border: '1px solid rgba(255,255,255,.25)',
        }}
      >
        <div className="row g-0 align-items-center">
          <div className="col-lg-6 p-4 p-lg-5">
            <span className="badge bg-primary-subtle text-primary mb-2">Contact</span>
            <h1 className="display-6 fw-bold mb-2">
              Dis-nous <span className="text-gradient">tout</span> ✉️
            </h1>
            <p className="text-muted">
              Une question, une idée, un bug ? On lit tous les messages et on répond vite.
            </p>
          </div>
          <div className="col-lg-6 d-none d-lg-block">
            <div
              style={{
                height: 320,
                backgroundImage:
                  'url(https://images.unsplash.com/photo-1481833761820-0509d3217039?q=80&w=1600&auto=format&fit=crop)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </div>
        </div>
      </section>

      <div className="row">
        <div className="col-xl-9 mx-auto">
          {/* ===== Carte coordonnées / réponse  ===== */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <div className="card round-xl p-3 h-100">
                <h5 className="mb-2">Infos pratiques</h5>
                <ul className="list-unstyled mb-0 text-muted">
                  <li>📫 support@cookrecettes.app</li>
                  <li>🐞 Signaler un bug via ce formulaire</li>
                  <li>💡 Proposer une amélioration</li>
                </ul>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card round-xl p-3 h-100">
                <h5 className="mb-2">Temps de réponse</h5>
                <p className="mb-0 text-muted">
                  On répond généralement sous 24–48h ouvrées. Merci pour ta patience 🙏
                </p>
              </div>
            </div>
          </div>

          {/* ===== Formulaire ===== */}
          <div className="card round-xl p-3 p-md-4 mb-4">
            <h3 className="mb-3">Nous écrire</h3>

            {sent ? (
              <div className="alert alert-success round-xl">
                Merci ! Ton message a bien été envoyé ✅
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                {/* Honeypot caché */}
                <input
                  type="text"
                  value={form.website}
                  onChange={e => upd('website', e.target.value)}
                  style={{ position: 'absolute', left: -9999, width: 1, height: 1 }}
                  aria-hidden="true"
                />

                <div className="row">
                  <div className="col-md-6 mb-2">
                    <label className="form-label">Nom</label>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={e => upd('name', e.target.value)}
                      placeholder="Prénom Nom"
                    />
                  </div>
                  <div className="col-md-6 mb-2">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={e => upd('email', e.target.value)}
                      placeholder="vous@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label">Sujet *</label>
                  <input
                    className="form-control"
                    value={form.subject}
                    onChange={e => upd('subject', e.target.value)}
                    placeholder="Ex : Problème d’upload d’image"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Message *</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    value={form.message}
                    onChange={e => upd('message', e.target.value)}
                    placeholder="Décris-nous le contexte, ce que tu essayais de faire, etc."
                    required
                  />
                </div>

                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="agree"
                    checked={form.agree}
                    onChange={e => upd('agree', e.target.checked)}
                  />
                  <label htmlFor="agree" className="form-check-label">
                    J’accepte que mes données soient utilisées pour répondre à ma demande.
                  </label>
                </div>

                <button className="btn btn-primary" disabled={sending}>
                  {sending ? 'Envoi…' : 'Envoyer le message'}
                </button>
              </form>
            )}
          </div>

          {/* ===== Newsletter ===== */}
          <div
            className="round-xl p-4 p-md-5 mb-5 d-flex flex-column flex-md-row align-items-center justify-content-between"
            style={{
              background: 'linear-gradient(90deg, #F97316, #F43F5E)',
              color: 'white',
            }}
          >
            <div className="me-md-4 mb-3 mb-md-0">
              <h4 className="fw-bold mb-1">Reste informé des nouveautés</h4>
              <p className="mb-0 opacity-75">
                Reçois les nouvelles recettes et les tops de la semaine.
              </p>
            </div>

            {subscribed ? (
              <div className="badge bg-light text-dark p-3">Inscription confirmée ✅</div>
            ) : (
              <form onSubmit={onSubscribe} className="d-flex w-100" style={{ maxWidth: 520 }}>
                <input
                    type="email"
                    className="form-control me-2"
                    placeholder="Email address"
                    value={newsletterEmail}
                    onChange={e => setNewsletterEmail(e.target.value)}
                    required
                  />
                <button className="btn btn-dark" disabled={submittingNews}>
                  {submittingNews ? 'Envoi…' : 'S’abonner'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

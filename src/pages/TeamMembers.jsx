import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../hooks/useToast';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ImageWithFallback from '../components/ImageWithFallback';
import ImageUploader from '../components/ImageUploader';
import { exportMembersToExcel } from '../utils/exportExcel';
import {
  Users,
  UserPlus,
  Search,
  Edit,
  Trash2,
  Eye,
  Shirt,
  MessageCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  Shield,
  FileText,
  FileSpreadsheet,
  Camera,
} from 'lucide-react';
import { formatDate } from '../utils/formatting';

const EMPTY_FORM = {
  jersey_name: '',
  full_name: '',
  jersey_number: '',
  position: '',
  phone: '',
  telegram_status: 'JOINED',
  uniform_status: 'RECEIVED',
  avatar_url: '',
  notes: '',
};

export default function TeamMembers() {
  const { t, lang } = useLanguage();
  const toast = useToast();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uniformFilter, setUniformFilter] = useState('ALL');
  const [telegramFilter, setTelegramFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('CARDS'); // 'CARDS' | 'TABLE'

  // Add / Edit modal state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Profile detail modal state
  const [viewingMember, setViewingMember] = useState(null);
  const [quickPhotoSaving, setQuickPhotoSaving] = useState(false);

  // Confirm delete dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isLoading: false,
  });

  const reloadMembers = useCallback(
    async (showToast = false) => {
      setLoading(true);
      try {
        const list = await db.getClubMembers();
        setMembers(list);
        if (showToast) {
          toast.success(t('refreshedSuccess'));
        }
      } catch (err) {
        console.error('Failed to load members:', err);
        toast.error(err?.message || t('errorGeneric'));
      } finally {
        setLoading(false);
      }
    },
    [toast, t]
  );

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const list = await db.getClubMembers();
        if (active) setMembers(list);
      } catch (err) {
        console.error('Failed to load members:', err);
        if (active) toast.error(err?.message || 'Failed to load club members');
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [toast]);

  const stats = {
    total: members.length,
    uniformReceived: members.filter((m) => m.uniform_status === 'RECEIVED').length,
    uniformPending: members.filter((m) => m.uniform_status !== 'RECEIVED').length,
    telegramJoined: members.filter((m) => m.telegram_status === 'JOINED').length,
  };

  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (m.jersey_name || '').toLowerCase().includes(q) ||
      (m.full_name || '').toLowerCase().includes(q) ||
      String(m.jersey_number || '').toLowerCase().includes(q) ||
      (m.position || '').toLowerCase().includes(q);
    const matchesUniform = uniformFilter === 'ALL' || m.uniform_status === uniformFilter;
    const matchesTelegram = telegramFilter === 'ALL' || m.telegram_status === telegramFilter;
    return matchesSearch && matchesUniform && matchesTelegram;
  });

  const openAddModal = () => {
    setEditingMember(null);
    setFormData(EMPTY_FORM);
    setFormError('');
    setFormModalOpen(true);
  };

  const openEditModal = (member) => {
    setViewingMember(null);
    setEditingMember(member);
    setFormData({
      jersey_name: member.jersey_name || '',
      full_name: member.full_name || member.jersey_name || '',
      jersey_number: member.jersey_number || '',
      position: member.position || '',
      phone: member.phone || '',
      telegram_status: member.telegram_status || 'JOINED',
      uniform_status: member.uniform_status || 'RECEIVED',
      avatar_url: member.avatar_url || '',
      notes: member.notes || '',
    });
    setFormError('');
    setFormModalOpen(true);
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.jersey_name.trim()) {
      setFormError(t('errNameReq'));
      toast.error(t('errNameReq'));
      return;
    }

    setSaving(true);
    try {
      if (editingMember) {
        const updated = await db.updateClubMember(editingMember.id, formData);
        setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        toast.success(t('memberSaveSuccess'));
      } else {
        const created = await db.createClubMember(formData);
        setMembers((prev) => [...prev, created]);
        toast.success(t('memberCreateSuccess'));
      }
      setFormModalOpen(false);
    } catch (err) {
      const msg = err?.message || t('errorGeneric');
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickPhotoChange = async (newAvatarUrl) => {
    if (!viewingMember) return;
    setQuickPhotoSaving(true);
    try {
      const updated = await db.updateClubMember(viewingMember.id, {
        ...viewingMember,
        avatar_url: newAvatarUrl || '',
      });
      setViewingMember(updated);
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(t('memberUpdatePhotoQuick'));
    } catch (err) {
      toast.error(err?.message || t('errorGeneric'));
    } finally {
      setQuickPhotoSaving(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredMembers.length === 0) {
      toast.warning(t('memberEmptyExportToast'));
      return;
    }

    const activeFilters = [];
    if (uniformFilter !== 'ALL') activeFilters.push(`Uniform: ${uniformFilter}`);
    if (telegramFilter !== 'ALL') activeFilters.push(`Telegram: ${telegramFilter}`);
    if (searchQuery.trim()) activeFilters.push(`Search: "${searchQuery.trim()}"`);

    try {
      exportMembersToExcel(filteredMembers, {
        lang,
        filterSummary: activeFilters.join(', '),
      });
      toast.success(t('excelExportedToast'));
    } catch (err) {
      toast.error(err?.message || t('errorGeneric'));
    }
  };

  const handleDeleteMember = (member) => {
    setConfirmDialog({
      isOpen: true,
      title: t('memberDeleteConfirmTitle'),
      message: `${member.jersey_name}${member.jersey_number ? ` (#${member.jersey_number})` : ''} — ${t('memberDeleteConfirmMsg')}`,
      isLoading: false,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isLoading: true }));
        try {
          await db.deleteClubMember(member.id);
          setMembers((prev) => prev.filter((m) => m.id !== member.id));
          if (viewingMember?.id === member.id) {
            setViewingMember(null);
          }
          toast.success(t('memberDeleteSuccess'));
        } catch (err) {
          toast.error(err?.message || t('errorGeneric'));
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        }
      },
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#101C32]">
            {t('teamMembersTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t('teamMembersSubtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => reloadMembers(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-[#101C32] transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#2563EB] ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-emerald-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-60"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('exportExcelBtn')}</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('addMemberBtn')}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          title={t('memberTotalCount')}
          value={stats.total}
          subtitle={t('brandName')}
          icon={Users}
          color="navy"
        />
        <StatCard
          title={t('memberUniformReceivedCount')}
          value={stats.uniformReceived}
          subtitle={t('memberUniformReceived')}
          icon={Shirt}
          color="green"
        />
        <StatCard
          title={t('memberUniformPendingCount')}
          value={stats.uniformPending}
          subtitle={t('memberUniformPending')}
          icon={Clock}
          color="red"
        />
        <StatCard
          title={t('memberTelegramJoinedCount')}
          value={stats.telegramJoined}
          subtitle={t('memberTelegramJoined')}
          icon={MessageCircle}
          color="blue"
        />
      </div>

      {/* Directory Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter & Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-[#F8FAFC] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('memberSearchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-[#101C32] placeholder:text-slate-400 focus:outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Uniform Filter */}
            <select
              value={uniformFilter}
              onChange={(e) => setUniformFilter(e.target.value)}
              aria-label={t('memberUniform')}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-[#2563EB]"
            >
              <option value="ALL">
                {t('memberUniform')}: {t('filterAll')}
              </option>
              <option value="RECEIVED">
                {t('memberUniform')}: {t('memberUniformReceived')}
              </option>
              <option value="NOT_YET">
                {t('memberUniform')}: {t('memberUniformPending')}
              </option>
            </select>

            {/* Telegram Filter */}
            <select
              value={telegramFilter}
              onChange={(e) => setTelegramFilter(e.target.value)}
              aria-label={t('memberTelegram')}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-[#2563EB]"
            >
              <option value="ALL">
                {t('memberTelegram')}: {t('filterAll')}
              </option>
              <option value="JOINED">
                {t('memberTelegram')}: {t('memberTelegramJoined')}
              </option>
              <option value="NOT_JOINED">
                {t('memberTelegram')}: {t('memberTelegramNotJoined')}
              </option>
            </select>

            {/* View Toggle */}
            <div className="flex items-center p-1 bg-slate-200/70 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'CARDS'
                    ? 'bg-[#101C32] text-white'
                    : 'text-slate-600 hover:text-[#101C32]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{t('viewCards')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-[#101C32] text-white'
                    : 'text-slate-600 hover:text-[#101C32]'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>{t('viewTable')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <div className="w-7 h-7 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
            <span>{t('validating')}</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#101C32]">{t('memberNoResults')}</p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 rounded-xl cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('addMemberBtn')}</span>
            </button>
          </div>
        ) : viewMode === 'CARDS' ? (
          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="group rounded-2xl border border-slate-200 bg-white hover:border-[#2563EB]/50 hover:shadow-md transition-all p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setViewingMember(member)}
                    className="relative shrink-0 cursor-pointer group/avatar"
                    title={t('memberViewProfile')}
                  >
                    <ImageWithFallback
                      src={member.avatar_url}
                      fallbackText={member.jersey_name}
                      alt={member.jersey_name}
                      rounded="rounded-full"
                      className="w-14 h-14 border-2 border-slate-200 group-hover/avatar:border-[#2563EB] text-sm transition-colors"
                    />
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#101C32] text-white text-[10px] font-mono font-bold flex items-center justify-center border-2 border-white">
                      {member.jersey_number || '—'}
                    </span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setViewingMember(member)}
                      className="text-left w-full cursor-pointer"
                    >
                      <h3 className="text-sm font-extrabold text-[#101C32] group-hover:text-[#2563EB] truncate transition-colors">
                        {member.jersey_name}
                      </h3>
                    </button>
                    {member.full_name && member.full_name !== member.jersey_name && (
                      <p className="text-[11px] text-slate-500 truncate">{member.full_name}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {member.position || t('brandName')}
                    </p>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      member.telegram_status === 'JOINED'
                        ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    <MessageCircle className="w-2.5 h-2.5" />
                    {member.telegram_status === 'JOINED'
                      ? t('memberTelegramJoined')
                      : t('memberTelegramNotJoined')}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      member.uniform_status === 'RECEIVED'
                        ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    <Shirt className="w-2.5 h-2.5" />
                    {member.uniform_status === 'RECEIVED'
                      ? t('memberUniformReceived')
                      : t('memberUniformPending')}
                  </span>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingMember(member)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#2563EB] hover:text-blue-800 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t('memberViewProfile')}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(member)}
                      title={t('btnEdit')}
                      className="p-1.5 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMember(member)}
                      title={t('btnDelete')}
                      className="p-1.5 text-red-400 hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">{t('colNo')}</th>
                  <th className="py-3 px-4">{t('memberJerseyName')}</th>
                  <th className="py-3 px-4 text-center">{t('memberJerseyNumber')}</th>
                  <th className="py-3 px-4 hidden md:table-cell">{t('memberPosition')}</th>
                  <th className="py-3 px-4 text-center">{t('memberTelegram')}</th>
                  <th className="py-3 px-4 text-center">{t('memberUniform')}</th>
                  <th className="py-3 px-4 text-right">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredMembers.map((member, idx) => (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setViewingMember(member)}
                        className="flex items-center gap-3 text-left group cursor-pointer"
                      >
                        <ImageWithFallback
                          src={member.avatar_url}
                          fallbackText={member.jersey_name}
                          alt={member.jersey_name}
                          rounded="rounded-full"
                          className="w-9 h-9 border border-slate-200 text-xs shrink-0"
                        />
                        <div>
                          <span className="font-bold text-[#101C32] group-hover:text-[#2563EB] block transition-colors">
                            {member.jersey_name}
                          </span>
                          {member.full_name && member.full_name !== member.jersey_name && (
                            <span className="text-[11px] text-slate-400">{member.full_name}</span>
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-[#2563EB] border border-blue-200 font-mono font-bold">
                        {member.jersey_number ? `#${member.jersey_number}` : '—'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 hidden md:table-cell">
                      {member.position || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          member.telegram_status === 'JOINED'
                            ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {member.telegram_status === 'JOINED'
                          ? t('memberTelegramJoined')
                          : t('memberTelegramNotJoined')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          member.uniform_status === 'RECEIVED'
                            ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {member.uniform_status === 'RECEIVED'
                          ? t('memberUniformReceived')
                          : t('memberUniformPending')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingMember(member)}
                          title={t('memberViewProfile')}
                          className="p-1.5 text-slate-500 hover:text-[#101C32] hover:bg-slate-100 rounded-lg cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(member)}
                          title={t('btnEdit')}
                          className="p-1.5 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(member)}
                          title={t('btnDelete')}
                          className="p-1.5 text-red-400 hover:text-[#DC2626] hover:bg-red-50 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Member Modal */}
      {formModalOpen && (
        <Modal
          isOpen={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          title={editingMember ? t('editMemberTitle') : t('addMemberBtn')}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSaveMember} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-[#DC2626]">
                {formError}
              </div>
            )}

            <ImageUploader
              label={t('memberPhotoLabel')}
              value={formData.avatar_url}
              onChange={(url) => setFormData((prev) => ({ ...prev, avatar_url: url }))}
              folder="avatars"
              variant="avatar"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('memberJerseyName')} <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.jersey_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, jersey_name: e.target.value }))
                  }
                  placeholder="e.g., PATO"
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2.5 px-3 text-xs text-[#101C32] focus:border-[#2563EB] focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('memberJerseyNumber')}
                </label>
                <input
                  type="text"
                  value={formData.jersey_number}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, jersey_number: e.target.value }))
                  }
                  placeholder="e.g., 10"
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2.5 px-3 text-xs text-[#101C32] focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('memberFullName')}
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                  placeholder={t('playerNamePlaceholder')}
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2.5 px-3 text-xs text-[#101C32] focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('memberPosition')}
                </label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, position: e.target.value }))
                  }
                  placeholder={t('memberPositionPlaceholder')}
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2.5 px-3 text-xs text-[#101C32] focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('memberPhone')}
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder={t('memberPhonePlaceholder')}
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2.5 px-3 text-xs text-[#101C32] focus:border-[#2563EB] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('memberTelegram')}
                </label>
                <select
                  value={formData.telegram_status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, telegram_status: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2.5 px-3 text-xs text-[#101C32] focus:border-[#2563EB] focus:outline-hidden"
                >
                  <option value="JOINED">{t('memberTelegramJoined')}</option>
                  <option value="NOT_JOINED">{t('memberTelegramNotJoined')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('memberUniform')}
                </label>
                <select
                  value={formData.uniform_status}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, uniform_status: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2.5 px-3 text-xs text-[#101C32] focus:border-[#2563EB] focus:outline-hidden"
                >
                  <option value="RECEIVED">{t('memberUniformReceived')}</option>
                  <option value="NOT_YET">{t('memberUniformPending')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('memberNotes')}
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder={t('memberNotesPlaceholder')}
                className="w-full rounded-xl border border-slate-200 bg-[#F8FAFC] py-2 px-3 text-xs text-[#101C32] focus:border-[#2563EB] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                {t('btnCancel')}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 rounded-xl shadow-xs cursor-pointer"
              >
                {editingMember ? t('btnSaveChanges') : t('addMemberBtn')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Member Profile Detail Modal */}
      {viewingMember && (
        <Modal
          isOpen={Boolean(viewingMember)}
          onClose={() => setViewingMember(null)}
          title={t('memberProfileDetail')}
          maxWidth="max-w-md"
        >
          <div className="space-y-5">
            {/* Profile Hero Banner */}
            <div className="relative rounded-2xl overflow-hidden bg-[#101C32] p-5 text-white">
              <img
                src="/images/club-pitch.jpg"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover opacity-20"
              />
              <div className="relative flex items-center gap-4">
                <ImageWithFallback
                  src={viewingMember.avatar_url}
                  fallbackText={viewingMember.jersey_name}
                  alt={viewingMember.jersey_name}
                  rounded="rounded-full"
                  className="w-20 h-20 border-3 border-white/40 shadow-md text-lg shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#2563EB] text-white font-mono font-extrabold text-xs">
                      #{viewingMember.jersey_number || 'N/A'}
                    </span>
                    <span className="text-[11px] text-blue-200 font-semibold flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {t('brandName')}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold tracking-tight mt-1 truncate">
                    {viewingMember.jersey_name}
                  </h3>
                  <p className="text-xs text-slate-300 truncate">
                    {viewingMember.full_name || viewingMember.jersey_name}
                    {viewingMember.position ? ` • ${viewingMember.position}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Profile Photo Upload inside Profile Detail */}
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#101C32] mb-2">
                <Camera className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{t('memberPhotoLabel')}</span>
              </div>
              <ImageUploader
                value={viewingMember.avatar_url}
                onChange={handleQuickPhotoChange}
                folder="avatars"
                variant="avatar"
              />
              {quickPhotoSaving && (
                <p className="text-[11px] text-[#2563EB] mt-1 font-medium">{t('uploadingImage')}</p>
              )}
            </div>

            {/* Detailed Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                  {t('memberTelegram')}
                </span>
                <span
                  className={`mt-1 inline-flex items-center gap-1 font-bold ${
                    viewingMember.telegram_status === 'JOINED'
                      ? 'text-[#2563EB]'
                      : 'text-slate-500'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {viewingMember.telegram_status === 'JOINED'
                    ? t('memberTelegramJoined')
                    : t('memberTelegramNotJoined')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                  {t('memberUniform')}
                </span>
                <span
                  className={`mt-1 inline-flex items-center gap-1 font-bold ${
                    viewingMember.uniform_status === 'RECEIVED'
                      ? 'text-[#16A34A]'
                      : 'text-amber-600'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {viewingMember.uniform_status === 'RECEIVED'
                    ? t('memberUniformReceived')
                    : t('memberUniformPending')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                  {t('memberPhone')}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 font-semibold text-[#101C32]">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {viewingMember.phone || '—'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200">
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">
                  {t('memberPosition')}
                </span>
                <span className="mt-1 font-semibold text-[#101C32] block truncate">
                  {viewingMember.position || '—'}
                </span>
              </div>
            </div>

            {viewingMember.notes && (
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-slate-400 mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{t('memberNotes')}</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{viewingMember.notes}</p>
              </div>
            )}

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
              <span>{formatDate(viewingMember.updated_at || viewingMember.created_at)}</span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleDeleteMember(viewingMember)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#DC2626] bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('btnDelete')}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingMember(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  {t('btnCancel')}
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(viewingMember)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#101C32] hover:bg-[#1E293B] rounded-xl cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{t('btnEdit')}</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={t('btnDeletePermanently')}
        cancelText={t('btnCancel')}
        type="danger"
        isLoading={confirmDialog.isLoading}
      />
    </div>
  );
}

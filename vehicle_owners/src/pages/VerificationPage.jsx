import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock4,
  FileSpreadsheet,
  Lock,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import DocumentUploadCard from '../features/owner-verification/components/DocumentUploadCard';
import { ownerVerificationService } from '../services/ownerVerificationService';
import { OWNER_VERIFICATION_STATUS } from '../constants/domainEnums';

const VERIFICATION_STATUSES = {
  NOT_SUBMITTED: OWNER_VERIFICATION_STATUS.NOT_SUBMITTED,
  PENDING: OWNER_VERIFICATION_STATUS.PENDING_REVIEW,
  VERIFIED: OWNER_VERIFICATION_STATUS.VERIFIED,
  REJECTED: OWNER_VERIFICATION_STATUS.REJECTED,
};

const verificationStatusLabels = {
  [VERIFICATION_STATUSES.NOT_SUBMITTED]: 'Chưa gửi',
  [VERIFICATION_STATUSES.PENDING]: 'Đang chờ duyệt',
  [VERIFICATION_STATUSES.VERIFIED]: 'Đã xác thực',
  [VERIFICATION_STATUSES.REJECTED]: 'Bị từ chối',
};

const statusSteps = [
  { key: VERIFICATION_STATUSES.NOT_SUBMITTED, label: 'Chưa gửi', icon: CircleDashed },
  { key: VERIFICATION_STATUSES.PENDING, label: 'Đang chờ duyệt', icon: Clock4 },
  { key: VERIFICATION_STATUSES.VERIFIED, label: 'Đã xác thực', icon: ShieldCheck },
  { key: VERIFICATION_STATUSES.REJECTED, label: 'Bị từ chối', icon: XCircle },
];

const emptyDocState = {
  file: null,
  fileName: '',
  fileUrl: '',
  mimeType: '',
  fileSize: 0,
  documentNumber: '',
  expiryDate: '',
  adminNote: '',
  status: '',
  dirty: false,
};

const getStatusStyle = (status) => {
  switch (status) {
    case VERIFICATION_STATUSES.PENDING:
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case VERIFICATION_STATUSES.VERIFIED:
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case VERIFICATION_STATUSES.REJECTED:
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
};

const resolveStatusRank = (status) => {
  if (status === VERIFICATION_STATUSES.NOT_SUBMITTED) return 1;
  if (status === VERIFICATION_STATUSES.PENDING) return 2;
  if (status === VERIFICATION_STATUSES.VERIFIED) return 4;
  if (status === VERIFICATION_STATUSES.REJECTED) return 3;
  return 1;
};

function VerificationSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
          <div className="h-4 w-1/3 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-2/3 rounded bg-slate-200" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="h-10 rounded bg-slate-200" />
            <div className="h-10 rounded bg-slate-200" />
          </div>
          <div className="mt-4 h-20 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export default function VerificationPage() {
  const queryClient = useQueryClient();
  const [documentsDraft, setDocumentsDraft] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['owner-verification-status'],
    queryFn: ownerVerificationService.getVerificationStatus,
  });

  const requiredDocsQuery = useQuery({
    queryKey: ['owner-verification-required-documents'],
    queryFn: ownerVerificationService.getRequiredDocuments,
  });

  const submittedProfileQuery = useQuery({
    queryKey: ['owner-verification-submission'],
    queryFn: ownerVerificationService.getSubmittedVerificationProfile,
  });

  const currentStatus = statusQuery.data?.status || VERIFICATION_STATUSES.NOT_SUBMITTED;
  const isReadOnly =
    currentStatus === VERIFICATION_STATUSES.VERIFIED || currentStatus === VERIFICATION_STATUSES.PENDING;
  const canEdit = !isReadOnly;

  useEffect(() => {
    if (!requiredDocsQuery.data?.items?.length) {
      return;
    }

    const profileMap = new Map(
      (submittedProfileQuery.data?.documents || []).map((item) => [item.documentTypeId, item]),
    );
    const merged = {};

    requiredDocsQuery.data.items.forEach((docType) => {
      const current = profileMap.get(docType.id);
      merged[docType.id] = {
        ...emptyDocState,
        ...(current || {}),
      };
    });

    setDocumentsDraft(merged);
  }, [requiredDocsQuery.data, submittedProfileQuery.data]);

  const completion = useMemo(() => {
    const requiredDocs = requiredDocsQuery.data?.items || [];
    if (!requiredDocs.length) {
      return { percent: 0, done: 0, total: 0 };
    }

    const done = requiredDocs.filter((doc) => {
      const draft = documentsDraft[doc.id];
      return Boolean(draft?.file || draft?.fileUrl);
    }).length;

    return {
      percent: Math.round((done / requiredDocs.length) * 100),
      done,
      total: requiredDocs.length,
    };
  }, [documentsDraft, requiredDocsQuery.data]);

  const missingDocuments = useMemo(() => {
    const requiredDocs = requiredDocsQuery.data?.items || [];
    const missing = [];

    requiredDocs.forEach((docType) => {
      const docData = documentsDraft[docType.id] || emptyDocState;
      const missingFields = [];

      if (docType.required && !docData.file && !docData.fileUrl) {
        missingFields.push('file');
      }
      if (docType.requiresNumber && !String(docData.documentNumber || '').trim()) {
        missingFields.push('documentNumber');
      }
      if (docType.requiresExpiryDate && !String(docData.expiryDate || '').trim()) {
        missingFields.push('expiryDate');
      }

      if (missingFields.length) {
        missing.push({ id: docType.id, title: docType.title, fields: missingFields });
      }
    });

    return missing;
  }, [documentsDraft, requiredDocsQuery.data]);

  const invalidExpiryDocuments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requiredDocs = requiredDocsQuery.data?.items || [];
    const invalid = [];

    requiredDocs.forEach((docType) => {
      if (!docType.requiresExpiryDate) {
        return;
      }
      const expiryValue = documentsDraft[docType.id]?.expiryDate;
      if (!expiryValue) {
        return;
      }
      const expiryDate = new Date(expiryValue);
      if (Number.isNaN(expiryDate.getTime())) {
        invalid.push({ id: docType.id, title: docType.title });
        return;
      }
      expiryDate.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        invalid.push({ id: docType.id, title: docType.title });
      }
    });

    return invalid;
  }, [documentsDraft, requiredDocsQuery.data]);

  const handleDocumentChange = (documentTypeId, patch) => {
    setDocumentsDraft((prev) => ({
      ...prev,
      [documentTypeId]: {
        ...(prev[documentTypeId] || emptyDocState),
        ...patch,
        dirty: true,
      },
    }));
  };

  const submitDocuments = async () => {
    setSubmitError('');

    if (!canEdit) {
      return;
    }

    if (missingDocuments.length > 0) {
      const message = 'Hồ sơ còn thiếu giấy tờ. Vui lòng bổ sung đầy đủ trước khi gửi.';
      setSubmitError(message);
      toast.error(message);
      return;
    }

    if (invalidExpiryDocuments.length > 0) {
      const message = 'Có giấy tờ có ngày hết hạn không hợp lệ (Đã quá hạn).';
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setIsSubmitting(true);
    try {
      const requiredDocs = requiredDocsQuery.data?.items || [];
      const uploadJobs = [];

      requiredDocs.forEach((docType) => {
        const draft = documentsDraft[docType.id];
        if (!draft) {
          return;
        }

        const hasExistingFile = Boolean(draft.fileUrl);
        const hasNewFile = Boolean(draft.file);
        const payload = {
          documentTypeId: docType.id,
          documentNumber: String(draft.documentNumber || '').trim(),
          expiryDate: String(draft.expiryDate || '').trim(),
          file: draft.file,
        };

        if (currentStatus === VERIFICATION_STATUSES.REJECTED) {
          if (hasNewFile || draft.dirty) {
            uploadJobs.push(ownerVerificationService.updateDocument(docType.id, payload));
          }
          return;
        }

        if (hasNewFile) {
          uploadJobs.push(ownerVerificationService.uploadDocument(payload));
          return;
        }

        if (!hasExistingFile) {
          throw new Error(`${docType.title}: Chưa có tập tin tải lên.`);
        }
      });

      if (uploadJobs.length) {
        await Promise.all(uploadJobs);
      }

      await ownerVerificationService.submitVerificationDocuments({
        ownerId: statusQuery.data?.ownerId,
        missingDocuments: [],
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['owner-verification-status'] }),
        queryClient.invalidateQueries({ queryKey: ['owner-verification-submission'] }),
      ]);

      toast.success('Đã gửi hồ sơ thành công.');
    } catch (error) {
      const message = error.message || 'Gửi hồ sơ thất bại. Vui lòng thử lại.';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusClass = getStatusStyle(currentStatus);
  const statusRank = resolveStatusRank(currentStatus);
  const isDataLoading =
    requiredDocsQuery.isLoading || submittedProfileQuery.isLoading || statusQuery.isLoading;

  return (
    <section className="space-y-4">
      <PageHeader
        title="Xác thực tài khoản"
        description="Tải lên đầy đủ giấy tờ để quản trị viên kiểm tra và kích hoạt tài khoản cho thuê xe."
      />

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Trạng thái hiện tại</p>
            <span className={`mt-1 inline-flex rounded-full border px-3 py-1 text-sm font-bold ${statusClass}`}>
              {verificationStatusLabels[currentStatus]}
            </span>
          </div>
          {currentStatus === VERIFICATION_STATUSES.VERIFIED ? (
            <p className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} />
              Tài khoản đã xác thực. Biểu mẫu đã được khóa.
            </p>
          ) : null}
          {currentStatus === VERIFICATION_STATUSES.PENDING ? (
            <p className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
              <Clock4 size={16} />
              Hồ sơ đang chờ quản trị viên duyệt.
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {statusSteps.map((step) => {
            const Icon = step.icon;
            const isActive = resolveStatusRank(step.key) <= statusRank;
            return (
              <div
                key={step.key}
                className={`rounded-xl border px-3 py-3 text-sm ${
                  isActive ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                <p className="inline-flex items-center gap-1.5 font-semibold">
                  <Icon size={15} />
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-base font-extrabold text-slate-900">Tiến trình hoàn tất hồ sơ</h3>
          <p className="text-sm font-semibold text-slate-600">
            {completion.done}/{completion.total} giấy tờ đã hoàn tất    
          </p>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 transition-all"
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-600">Mức độ hoàn tất: {completion.percent}%</p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-bold text-slate-700">Danh sách giấy tờ</p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {(requiredDocsQuery.data?.items || []).map((docType) => {
              const done = Boolean(documentsDraft[docType.id]?.file || documentsDraft[docType.id]?.fileUrl);
              return (
                <p
                  key={docType.id}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {done ? <CheckCircle2 size={14} /> : <CircleDashed size={14} />}
                  {docType.title}
                </p>
              );
            })}
          </div>
        </div>
      </article>

      {statusQuery.data?.adminNote ? (
        <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle size={16} />
            Phần hồi đáp từ quản trị viên:
          </p>
          <p className="mt-2 text-sm text-amber-800">{statusQuery.data.adminNote}</p>
        </article>
      ) : null}

      {missingDocuments.length > 0 ? (
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700">
            <AlertTriangle size={16} />
            Hồ sơ còn thiếu {missingDocuments.length} giấy tờ/chứng từ
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-rose-700">
            {missingDocuments.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </article>
      ) : null}

      {invalidExpiryDocuments.length > 0 ? (
        <article className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-orange-800">
            <AlertTriangle size={16} />
            Có giấy tờ đã hết hạn hoặc sai ngày hết hạn
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-orange-700">
            {invalidExpiryDocuments.map((item) => (
              <li key={item.id}>{item.title}</li>
            ))}
          </ul>
        </article>
      ) : null}

      <article className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-cyan-800">
          <FileSpreadsheet size={16} />
          Hướng dẫn file
        </p>
        <ul className="mt-2 list-inside list-disc text-sm text-cyan-900">
          <li>Chấp nhận định dạng JPG, PNG, PDF.</li>
          <li>Ảnh/scan cần rõ nét, đầy đủ 4 góc, không bị mờ sáng.</li>
          <li>Dung lượng tối đa từng loại giấy tờ (8-10MB).</li>
          <li>Ngày hết hạn phải lớn hơn ngày hiện tại đối với giấy tờ bắt buộc.</li>
        </ul>
      </article>

      {isDataLoading ? (
        <VerificationSkeleton />
      ) : (
        <div className="grid gap-4">
          {(requiredDocsQuery.data?.items || []).map((docType) => (
            <DocumentUploadCard
              key={docType.id}
              documentType={docType}
              value={documentsDraft[docType.id] || emptyDocState}
              disabled={!canEdit || isSubmitting}
              onChange={handleDocumentChange}
              onFileError={(message) => {
                setSubmitError(message);
                toast.error(message);
              }}
            />
          ))}
        </div>
      )}

      {submitError ? (
        <article className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {submitError}
        </article>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {!canEdit ? (
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <Lock size={15} />
            Biểu mẫu đang bị khóa do trạng thái tài khoản hiện tại.
          </p>
        ) : (
          <p className="text-sm text-slate-600">Sau khi gửi, hồ sơ sẽ chuyển sang trạng thái chờ duyệt.</p>
        )}
        <button type="button" className="btn btn-primary" onClick={submitDocuments} disabled={!canEdit || isSubmitting}>
          {isSubmitting ? 'Đang gửi hồ sơ...' : currentStatus === VERIFICATION_STATUSES.REJECTED ? 'Cập nhật hồ sơ' : 'Gửi hồ sơ xác thực'}
        </button>
      </div>
    </section>
  );
}




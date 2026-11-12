import { Sheet } from '../../components/Sheet';
import { t } from '../../i18n';
import { useAccount, useRuntime } from '../../runtime/RuntimeProvider';
import { ProfileFormView } from './ProfileFormView';

/** The form for editing the person's own profile, in a sheet. */
export function EditProfileSheet({ onClose }: { onClose: () => void }) {
  const account = useAccount();
  const { households } = useRuntime();
  return (
    <Sheet visible title={t('Your profile')} onCancel={onClose} scroll={false}>
      {account.profile ? (
        <ProfileFormView profile={account.profile} submitTitle={t('Save')} onSubmit={(updated) => {
          account.saveProfile(updated);
          if (account.userRecordName) households.updateProfile(updated, account.userRecordName);
          onClose();
        }} />
      ) : null}
    </Sheet>
  );
}

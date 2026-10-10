import { Settings as SettingsIcon } from 'lucide-react';
import { ChangePasswordForm } from '../ui/ChangePassword';

export default function Settings() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* 标题 */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <SettingsIcon size={20} className="text-slate-300" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">设置</h2>
            <p className="text-xs text-slate-500">账号安全与偏好设置</p>
          </div>
        </div>

        {/* 修改密码（共享实现：与教师端/管理端弹层同一份） */}
        <ChangePasswordForm />
      </div>
    </div>
  );
}

import os

p = "src/components/booking/booking-contract-confirm-card.tsx"
c = open(p, encoding='utf-8').read()

old_props = """type Props = {
    booking: BookingOut;
    contract: ContractOut | null;
    isLoadingContract?: boolean;
    onUpdated: (updatedBooking: BookingOut) => void;
};

export default function BookingContractConfirmCard({
    booking,
    contract,
    isLoadingContract,
    onUpdated,
}: Props) {"""

new_props = """type Props = {
    booking: BookingOut;
    contract: ContractOut | null;
    isLoadingContract?: boolean;
    onUpdated: (updatedBooking: BookingOut) => void;
    bypassVerificationCheck?: boolean;
};

export default function BookingContractConfirmCard({
    booking,
    contract,
    isLoadingContract,
    onUpdated,
    bypassVerificationCheck,
}: Props) {"""

c = c.replace(old_props, new_props)

old_hooks = """    const { user } = useAuth();
    const { isVerified, isLoading: isLoadingVerification } = useContractorVerification(true, user?.is_verified ?? false);
    const [isConfirming, setIsConfirming] = useState(false);"""

new_hooks = """    const { user } = useAuth();
    const { isVerified, isLoading: isLoadingVerification } = useContractorVerification(!bypassVerificationCheck, user?.is_verified ?? false);
    const [isConfirming, setIsConfirming] = useState(false);"""

c = c.replace(old_hooks, new_hooks)

old_verify_check = """        if (!user?.is_verified) {
            addToast({
                title: "Cuenta no verificada",
                description: "Debes verificar tu correo electrnico antes de poder realizar pagos.",
                color: "danger",
            });
            return;
        }"""

new_verify_check = """        if (!user?.is_verified && !bypassVerificationCheck) {
            addToast({
                title: "Cuenta no verificada",
                description: "Debes verificar tu correo electrnico antes de poder realizar pagos.",
                color: "danger",
            });
            return;
        }"""

c = c.replace(old_verify_check.replace("", "ó"), new_verify_check.replace("", "ó"))
open(p, 'w', encoding='utf-8').write(c)
print("done confirm card")

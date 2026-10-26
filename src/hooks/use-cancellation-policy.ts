"use client";

import { useEffect, useState } from "react";
import {
    type CancellationPolicy,
    DEFAULT_CANCELLATION_POLICY,
    fetchCancellationPolicy,
    getCachedCancellationPolicy,
} from "@/lib/cancellation-policy";

export function useCancellationPolicy(
    initial?: Partial<CancellationPolicy> | null
): CancellationPolicy {
    const [policy, setPolicy] = useState<CancellationPolicy>(() => ({
        ...DEFAULT_CANCELLATION_POLICY,
        ...(getCachedCancellationPolicy() ?? {}),
        ...(initial ?? {}),
    }));

    useEffect(() => {
        if (initial && initial.full_refund_min_days !== undefined) {
            return;
        }
        let cancelled = false;
        fetchCancellationPolicy().then((fetched) => {
            if (!cancelled) {
                setPolicy(fetched);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [initial]);

    if (initial && initial.full_refund_min_days !== undefined) {
        return {
            ...DEFAULT_CANCELLATION_POLICY,
            ...initial,
        };
    }

    return policy;
}

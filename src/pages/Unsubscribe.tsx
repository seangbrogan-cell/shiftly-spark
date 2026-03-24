import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

type Status = 'loading' | 'valid' | 'already' | 'invalid' | 'success' | 'error';

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
      .then(r => r.json())
      .then(d => {
        if (d.valid === false && d.reason === 'already_unsubscribed') setStatus('already');
        else if (d.valid) setStatus('valid');
        else setStatus('invalid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const { data } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } });
      if (data?.success) setStatus('success');
      else if (data?.reason === 'already_unsubscribed') setStatus('already');
      else setStatus('error');
    } catch { setStatus('error'); }
    setConfirming(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          {status === 'loading' && <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />}
          {status === 'valid' && (
            <>
              <h1 className="text-xl font-semibold">Unsubscribe</h1>
              <p className="text-muted-foreground">Are you sure you want to unsubscribe from future emails?</p>
              <Button onClick={handleConfirm} disabled={confirming} className="w-full">
                {confirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Unsubscribe
              </Button>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-semibold">Unsubscribed</h1>
              <p className="text-muted-foreground">You will no longer receive these emails.</p>
            </>
          )}
          {status === 'already' && (
            <>
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <h1 className="text-xl font-semibold">Already Unsubscribed</h1>
              <p className="text-muted-foreground">You've already been unsubscribed.</p>
            </>
          )}
          {status === 'invalid' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold">Invalid Link</h1>
              <p className="text-muted-foreground">This unsubscribe link is invalid or expired.</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h1 className="text-xl font-semibold">Something went wrong</h1>
              <p className="text-muted-foreground">Please try again later.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

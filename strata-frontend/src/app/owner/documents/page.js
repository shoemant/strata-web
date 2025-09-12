'use client';

import { useEffect, useState } from 'react';
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react';
import ProtectedRoute from '@/components/ProtectedRoute';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FileText, RefreshCw, ExternalLink } from 'lucide-react';

export default function ViewDocumentsPage() {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [documents, setDocuments] = useState([]);
  const [buildingName, setBuildingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (user?.id) fetchDocuments();
  }, [user?.id]);

  const fetchDocuments = async () => {
    setLoading(true);
    setLoadError('');

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('building_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.building_id) {
      console.error('Failed to fetch user building:', profileError);
      setLoadError('No building assigned to your profile.');
      setDocuments([]);
      setLoading(false);
      return;
    }

    const { data: buildingData } = await supabase
      .from('buildings')
      .select('name')
      .eq('id', profile.building_id)
      .single();

    setBuildingName(buildingData?.name || '');

    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id, title, category, url, created_at')
      .eq('building_id', profile.building_id)
      .order('created_at', { ascending: false });

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      setLoadError('Failed to load documents.');
      setDocuments([]);
    } else {
      setDocuments(docs || []);
    }

    setLoading(false);
  };

  return (
    <ProtectedRoute allowedRoles={['owner']}>
      <div className="absolute inset-y-0 left-16 right-0  bg-background p-6 space-y-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
            <p className="text-sm text-muted-foreground">
              {buildingName ? `Building: ${buildingName}` : 'Your building'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDocuments} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Separator />

        {loadError && (
          <Alert variant="destructive">
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No documents available.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl border p-2">
                        <FileText className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {doc.category || 'General'}
                    </Badge>
                  </div>
                  <CardDescription className="mt-1">
                    Uploaded {new Date(doc.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1" />
                <CardFooter className="justify-end">
                  <Button asChild variant="outline">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      Open <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

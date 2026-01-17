import { useTranslation } from '@/i18n';
import { useAppState } from '@/store/appState';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FolderOpen, Sparkles } from 'lucide-react';

export function HomeScreen() {
  const { t } = useTranslation();
  const { setIntent } = useAppState();

  const handleOrganize = () => {
    setIntent('organize');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-lg w-full space-y-8">
        {/* Main action card */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 flex items-center justify-center">
              <FolderOpen className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">
                {t('home.cleanUp')}
              </h1>
              <p className="text-muted-foreground">
                {t('home.cleanUpDesc')}
              </p>
            </div>
            <Button size="xl" className="w-full gap-2" onClick={handleOrganize}>
              <Sparkles className="h-5 w-5" />
              {t('welcome.getStarted')}
            </Button>
          </CardContent>
        </Card>

        {/* Recent activity section */}
        <div className="pt-6 border-t">
          <h3 className="text-lg font-medium mb-4">
            {t('home.recentActivity')}
          </h3>
          <p className="text-muted-foreground text-sm">
            {t('home.noRecentActivity')}
          </p>
        </div>
      </div>
    </div>
  );
}

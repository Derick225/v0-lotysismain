'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OptimizedIcon } from './ui/optimized-icons'
import { AccessibleButton } from './ui/accessible-components'
import { 
  usePublicAPI, 
  useAPIKey, 
  useAPIPermissions, 
  useAPIStats, 
  useAPIDocumentation 
} from '../hooks/use-public-api'
import type { APIKey, APIPermission } from '../lib/public-api-manager'

interface APIManagementDashboardProps {
  className?: string
}

export function APIManagementDashboard({ className }: APIManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState('keys')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const {
    apiKeys,
    createAPIKey,
    revokeAPIKey,
    testAPIKey,
    usageStats,
    isLoading,
    error
  } = usePublicAPI()

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <OptimizedIcon name="Key" critical size={20} />
            Gestion API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="keys">Clés API</TabsTrigger>
              <TabsTrigger value="stats">Statistiques</TabsTrigger>
              <TabsTrigger value="docs">Documentation</TabsTrigger>
              <TabsTrigger value="test">Test</TabsTrigger>
            </TabsList>

            <TabsContent value="keys" className="space-y-4">
              <APIKeysSection
                apiKeys={apiKeys}
                onCreateKey={() => setIsCreateDialogOpen(true)}
                onRevokeKey={revokeAPIKey}
                onTestKey={testAPIKey}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <APIStatsSection stats={usageStats} />
            </TabsContent>

            <TabsContent value="docs" className="space-y-4">
              <APIDocumentationSection />
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <APITestSection apiKeys={apiKeys} />
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <OptimizedIcon name="AlertCircle" critical size={16} />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Créer une nouvelle clé API</DialogTitle>
              </DialogHeader>
              <CreateAPIKeyForm
                onCreateKey={createAPIKey}
                onClose={() => setIsCreateDialogOpen(false)}
                isLoading={isLoading}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}

// Section des clés API
function APIKeysSection({ 
  apiKeys, 
  onCreateKey, 
  onRevokeKey, 
  onTestKey, 
  isLoading 
}: {
  apiKeys: APIKey[]
  onCreateKey: () => void
  onRevokeKey: (id: string) => Promise<boolean>
  onTestKey: (key: string) => Promise<any>
  isLoading: boolean
}) {
  if (apiKeys.length === 0) {
    return (
      <div className="text-center py-8">
        <OptimizedIcon name="Key" critical size={48} className="mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Aucune clé API</h3>
        <p className="text-muted-foreground mb-4">
          Créez votre première clé API pour commencer à utiliser l'API Lotysis.
        </p>
        <AccessibleButton onClick={onCreateKey} disabled={isLoading}>
          <OptimizedIcon name="Plus" critical size={16} className="mr-2" />
          Créer une clé API
        </AccessibleButton>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Clés API ({apiKeys.length})</h3>
        <AccessibleButton onClick={onCreateKey} disabled={isLoading}>
          <OptimizedIcon name="Plus" critical size={16} className="mr-2" />
          Nouvelle clé
        </AccessibleButton>
      </div>

      <div className="space-y-3">
        {apiKeys.map((apiKey) => (
          <APIKeyCard
            key={apiKey.id}
            apiKey={apiKey}
            onRevoke={() => onRevokeKey(apiKey.id)}
            onTest={() => onTestKey(apiKey.key)}
          />
        ))}
      </div>
    </div>
  )
}

// Carte de clé API
function APIKeyCard({ 
  apiKey, 
  onRevoke, 
  onTest 
}: { 
  apiKey: APIKey
  onRevoke: () => void
  onTest: () => void
}) {
  const [showKey, setShowKey] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [isTesting, setIsTesting] = useState(false)

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const result = await onTest()
      setTestResult(result)
    } finally {
      setIsTesting(false)
    }
  }

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(apiKey.key)
    } catch (error) {
      console.error('Erreur copie clé:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'suspended': return 'secondary'
      case 'revoked': return 'destructive'
      default: return 'outline'
    }
  }

  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()

  return (
    <Card className={isExpired ? 'border-red-200 bg-red-50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium">{apiKey.name}</h4>
            <p className="text-sm text-muted-foreground">
              Créée le {new Date(apiKey.createdAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(apiKey.status)}>
              {apiKey.status}
            </Badge>
            {isExpired && (
              <Badge variant="destructive">Expirée</Badge>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Clé API</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={showKey ? apiKey.key : '•'.repeat(32)}
                readOnly
                className="font-mono text-sm"
              />
              <AccessibleButton
                onClick={() => setShowKey(!showKey)}
                variant="outline"
                size="sm"
                ariaLabel={showKey ? "Masquer la clé" : "Afficher la clé"}
              >
                <OptimizedIcon name={showKey ? "EyeOff" : "Eye"} critical size={14} />
              </AccessibleButton>
              <AccessibleButton
                onClick={copyKey}
                variant="outline"
                size="sm"
                ariaLabel="Copier la clé"
              >
                <OptimizedIcon name="Copy" critical size={14} />
              </AccessibleButton>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="text-center p-2 border rounded">
              <div className="text-lg font-bold">{apiKey.usage.totalRequests}</div>
              <div className="text-xs text-muted-foreground">Requêtes totales</div>
            </div>
            <div className="text-center p-2 border rounded">
              <div className="text-lg font-bold">{apiKey.usage.requestsToday}</div>
              <div className="text-xs text-muted-foreground">Aujourd'hui</div>
            </div>
            <div className="text-center p-2 border rounded">
              <div className="text-lg font-bold">{apiKey.rateLimit.requestsPerDay}</div>
              <div className="text-xs text-muted-foreground">Limite/jour</div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Permissions</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {apiKey.permissions.map((permission, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {permission.resource}:{permission.actions.join(',')}
                </Badge>
              ))}
            </div>
          </div>

          {testResult && (
            <div className={`p-2 rounded text-sm ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {testResult.success ? (
                `✅ Test réussi (${testResult.latency}ms)`
              ) : (
                `❌ Test échoué: ${testResult.error}`
              )}
            </div>
          )}

          <div className="flex gap-2">
            <AccessibleButton
              onClick={handleTest}
              disabled={isTesting || apiKey.status !== 'active'}
              variant="outline"
              size="sm"
            >
              <OptimizedIcon 
                name={isTesting ? "Loader2" : "Zap"} 
                critical 
                size={14} 
                className={`mr-2 ${isTesting ? 'animate-spin' : ''}`}
              />
              Tester
            </AccessibleButton>
            
            <AccessibleButton
              onClick={onRevoke}
              disabled={apiKey.status === 'revoked'}
              variant="outline"
              size="sm"
            >
              <OptimizedIcon name="Trash2" size={14} className="mr-2 text-red-500" />
              Révoquer
            </AccessibleButton>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Formulaire de création de clé API
function CreateAPIKeyForm({ 
  onCreateKey, 
  onClose, 
  isLoading 
}: {
  onCreateKey: (config: any) => Promise<APIKey | null>
  onClose: () => void
  isLoading: boolean
}) {
  const [name, setName] = useState('')
  const [selectedPermissions, setSelectedPermissions] = useState<APIPermission[]>([])
  const [expiresIn, setExpiresIn] = useState<string>('30')
  const [rateLimit, setRateLimit] = useState({
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000
  })

  const { availablePermissions, createPermissionSet } = useAPIPermissions()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim() || selectedPermissions.length === 0) {
      return
    }

    const config = {
      name: name.trim(),
      permissions: selectedPermissions,
      rateLimit,
      expiresIn: expiresIn === 'never' ? undefined : parseInt(expiresIn)
    }

    const apiKey = await onCreateKey(config)
    if (apiKey) {
      onClose()
      // Reset form
      setName('')
      setSelectedPermissions([])
      setExpiresIn('30')
    }
  }

  const handlePermissionSetChange = (level: string) => {
    if (level === 'custom') return
    setSelectedPermissions(createPermissionSet(level as any))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="name">Nom de la clé</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Mon application"
          required
        />
      </div>

      <div>
        <Label>Niveau de permissions</Label>
        <Select onValueChange={handlePermissionSetChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un niveau" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="basic">Basique (lecture seule)</SelectItem>
            <SelectItem value="advanced">Avancé (lecture + écriture)</SelectItem>
            <SelectItem value="full">Complet (tous droits)</SelectItem>
            <SelectItem value="custom">Personnalisé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Permissions détaillées</Label>
        <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
          {availablePermissions.map((permission, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Checkbox
                id={`permission-${index}`}
                checked={selectedPermissions.some(p => 
                  p.resource === permission.resource && 
                  JSON.stringify(p.actions) === JSON.stringify(permission.actions) &&
                  p.scope === permission.scope
                )}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedPermissions([...selectedPermissions, permission])
                  } else {
                    setSelectedPermissions(selectedPermissions.filter(p => 
                      !(p.resource === permission.resource && 
                        JSON.stringify(p.actions) === JSON.stringify(permission.actions) &&
                        p.scope === permission.scope)
                    ))
                  }
                }}
              />
              <Label htmlFor={`permission-${index}`} className="text-sm">
                {permission.resource}: {permission.actions.join(', ')} ({permission.scope})
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Expiration</Label>
        <Select value={expiresIn} onValueChange={setExpiresIn}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
            <SelectItem value="90">90 jours</SelectItem>
            <SelectItem value="365">1 an</SelectItem>
            <SelectItem value="never">Jamais</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label>Requêtes/minute</Label>
          <Input
            type="number"
            value={rateLimit.requestsPerMinute}
            onChange={(e) => setRateLimit({
              ...rateLimit,
              requestsPerMinute: parseInt(e.target.value) || 60
            })}
            min="1"
            max="1000"
          />
        </div>
        <div>
          <Label>Requêtes/heure</Label>
          <Input
            type="number"
            value={rateLimit.requestsPerHour}
            onChange={(e) => setRateLimit({
              ...rateLimit,
              requestsPerHour: parseInt(e.target.value) || 1000
            })}
            min="1"
            max="10000"
          />
        </div>
        <div>
          <Label>Requêtes/jour</Label>
          <Input
            type="number"
            value={rateLimit.requestsPerDay}
            onChange={(e) => setRateLimit({
              ...rateLimit,
              requestsPerDay: parseInt(e.target.value) || 10000
            })}
            min="1"
            max="100000"
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <AccessibleButton
          type="button"
          onClick={onClose}
          variant="outline"
          disabled={isLoading}
        >
          Annuler
        </AccessibleButton>
        <AccessibleButton
          type="submit"
          disabled={isLoading || !name.trim() || selectedPermissions.length === 0}
        >
          {isLoading ? 'Création...' : 'Créer la clé'}
        </AccessibleButton>
      </div>
    </form>
  )
}

// Section des statistiques API
function APIStatsSection({ stats }: { stats: any }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Statistiques d'utilisation</h3>
      
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalRequests || 0}</div>
            <div className="text-sm text-muted-foreground">Requêtes totales</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.requestsToday || 0}</div>
            <div className="text-sm text-muted-foreground">Aujourd'hui</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.averageResponseTime?.toFixed(0) || 0}ms</div>
            <div className="text-sm text-muted-foreground">Temps moyen</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.errorRate?.toFixed(1) || 0}%</div>
            <div className="text-sm text-muted-foreground">Taux d'erreur</div>
          </CardContent>
        </Card>
      </div>

      {stats.topEndpoints && stats.topEndpoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Endpoints les plus utilisés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topEndpoints.slice(0, 5).map((endpoint: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-mono">{endpoint.endpoint}</span>
                  <Badge variant="outline">{endpoint.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Section de documentation API
function APIDocumentationSection() {
  const { endpoints, generateCurlExample, generateJSExample } = useAPIDocumentation()
  const [selectedEndpoint, setSelectedEndpoint] = useState(endpoints[0])

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Documentation API</h3>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Endpoints disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {endpoints.map((endpoint, index) => (
                <div
                  key={index}
                  className={`p-2 rounded cursor-pointer border ${
                    selectedEndpoint === endpoint ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setSelectedEndpoint(endpoint)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'}>
                      {endpoint.method}
                    </Badge>
                    <span className="font-mono text-sm">{endpoint.path}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{endpoint.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Détails de l'endpoint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2">Paramètres</h4>
                {selectedEndpoint.parameters.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEndpoint.parameters.map((param: any, index: number) => (
                      <div key={index} className="text-sm">
                        <span className="font-mono">{param.name}</span>
                        <span className="text-muted-foreground"> ({param.type})</span>
                        {param.required && <span className="text-red-500"> *</span>}
                        <p className="text-xs text-muted-foreground">{param.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun paramètre</p>
                )}
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Exemple cURL</h4>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {generateCurlExample(selectedEndpoint)}
                </pre>
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Exemple JavaScript</h4>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {generateJSExample(selectedEndpoint)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Section de test API
function APITestSection({ apiKeys }: { apiKeys: APIKey[] }) {
  const [selectedKey, setSelectedKey] = useState<string>('')
  const [testResult, setTestResult] = useState<any>(null)
  const [isTesting, setIsTesting] = useState(false)

  const { testAPIKey } = usePublicAPI()

  const handleTest = async () => {
    if (!selectedKey) return

    setIsTesting(true)
    try {
      const result = await testAPIKey(selectedKey)
      setTestResult(result)
    } finally {
      setIsTesting(false)
    }
  }

  const activeKeys = apiKeys.filter(key => key.status === 'active')

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Test de l'API</h3>
      
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label>Clé API à tester</Label>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une clé API" />
              </SelectTrigger>
              <SelectContent>
                {activeKeys.map((key) => (
                  <SelectItem key={key.id} value={key.key}>
                    {key.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AccessibleButton
            onClick={handleTest}
            disabled={!selectedKey || isTesting}
            className="w-full"
          >
            <OptimizedIcon 
              name={isTesting ? "Loader2" : "Zap"} 
              critical 
              size={16} 
              className={`mr-2 ${isTesting ? 'animate-spin' : ''}`}
            />
            {isTesting ? 'Test en cours...' : 'Tester la connexion'}
          </AccessibleButton>

          {testResult && (
            <div className={`p-4 rounded border ${
              testResult.success 
                ? 'border-green-200 bg-green-50 text-green-800' 
                : 'border-red-200 bg-red-50 text-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <OptimizedIcon 
                  name={testResult.success ? "CheckCircle" : "XCircle"} 
                  critical 
                  size={16} 
                />
                <span className="font-medium">
                  {testResult.success ? 'Test réussi' : 'Test échoué'}
                </span>
              </div>
              <div className="text-sm">
                <p>Latence: {testResult.latency}ms</p>
                {testResult.error && <p>Erreur: {testResult.error}</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

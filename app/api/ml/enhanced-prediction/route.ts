import { NextRequest, NextResponse } from 'next/server'
import { EnhancedMLPredictionService } from '../../../services/enhanced-ml-prediction-service'
import { supabase } from '../../../../lib/supabase'
import { DrawResult } from '../../../lib/constants'

// GET - Get model status and performance metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    const mlService = EnhancedMLPredictionService.getInstance()
    
    switch (action) {
      case 'status':
        const performanceMetrics = mlService.getPerformanceMetrics()
        const config = mlService.getConfig()
        
        return NextResponse.json({
          success: true,
          status: {
            initialized: true,
            models: {
              xgboost: {
                status: 'ready',
                accuracy: performanceMetrics.get('xgboost')?.accuracy.slice(-1)[0] || 0,
                predictions: performanceMetrics.get('xgboost')?.predictions || 0,
                lastUpdate: performanceMetrics.get('xgboost')?.lastUpdate || Date.now()
              },
              lstm: {
                status: 'ready',
                accuracy: performanceMetrics.get('lstm')?.accuracy.slice(-1)[0] || 0,
                predictions: performanceMetrics.get('lstm')?.predictions || 0,
                lastUpdate: performanceMetrics.get('lstm')?.lastUpdate || Date.now()
              },
              monteCarlo: {
                status: 'ready',
                accuracy: performanceMetrics.get('monteCarlo')?.accuracy.slice(-1)[0] || 0,
                predictions: performanceMetrics.get('monteCarlo')?.predictions || 0,
                lastUpdate: performanceMetrics.get('monteCarlo')?.lastUpdate || Date.now()
              },
              reinforcement: {
                status: 'ready',
                accuracy: performanceMetrics.get('reinforcement')?.accuracy.slice(-1)[0] || 0,
                predictions: performanceMetrics.get('reinforcement')?.predictions || 0,
                lastUpdate: performanceMetrics.get('reinforcement')?.lastUpdate || Date.now()
              },
              ensemble: {
                status: 'ready',
                accuracy: performanceMetrics.get('ensemble')?.accuracy.slice(-1)[0] || 0,
                predictions: performanceMetrics.get('ensemble')?.predictions || 0,
                lastUpdate: performanceMetrics.get('ensemble')?.lastUpdate || Date.now()
              }
            },
            config
          }
        })
        
      case 'performance':
        const metrics = mlService.getPerformanceMetrics()
        const performanceData = Array.from(metrics.entries()).map(([model, data]) => ({
          model,
          accuracy: data.accuracy,
          loss: data.loss,
          predictions: data.predictions,
          lastUpdate: data.lastUpdate
        }))
        
        return NextResponse.json({
          success: true,
          performance: performanceData
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in enhanced ML API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST - Train models or make predictions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, drawType, data: inputData, config } = body
    
    const mlService = EnhancedMLPredictionService.getInstance()
    await mlService.initialize()
    
    switch (action) {
      case 'train':
        if (!inputData || !Array.isArray(inputData)) {
          return NextResponse.json({
            success: false,
            error: 'Training data is required'
          }, { status: 400 })
        }
        
        if (inputData.length < 50) {
          return NextResponse.json({
            success: false,
            error: 'Insufficient training data. Need at least 50 historical draws.'
          }, { status: 400 })
        }
        
        // Update configuration if provided
        if (config) {
          mlService.updateConfig(config)
        }
        
        // Train the models
        await mlService.train(inputData, drawType || 'National')
        
        return NextResponse.json({
          success: true,
          message: 'Models trained successfully',
          drawType: drawType || 'National',
          trainingDataSize: inputData.length
        })
        
      case 'predict':
        if (!inputData || !Array.isArray(inputData)) {
          // Try to load data from Supabase
          const { data: supabaseData, error } = await supabase
            .from('lottery_results')
            .select('*')
            .eq('draw_name', drawType || 'National')
            .order('date', { ascending: false })
            .limit(100)
          
          if (error || !supabaseData || supabaseData.length < 30) {
            // Fallback to simulated data
            const simulatedData = generateSimulatedData(drawType || 'National', 50)
            const prediction = await mlService.predict(simulatedData, drawType || 'National')
            
            return NextResponse.json({
              success: true,
              prediction,
              dataSource: 'simulated',
              message: 'Prediction generated using simulated data'
            })
          }
          
          const prediction = await mlService.predict(supabaseData, drawType || 'National')
          
          return NextResponse.json({
            success: true,
            prediction,
            dataSource: 'database'
          })
        } else {
          if (inputData.length < 30) {
            return NextResponse.json({
              success: false,
              error: 'Insufficient data for prediction. Need at least 30 recent draws.'
            }, { status: 400 })
          }
          
          const prediction = await mlService.predict(inputData, drawType || 'National')
          
          return NextResponse.json({
            success: true,
            prediction,
            dataSource: 'provided'
          })
        }
        
      case 'update_config':
        if (!config) {
          return NextResponse.json({
            success: false,
            error: 'Configuration data is required'
          }, { status: 400 })
        }
        
        mlService.updateConfig(config)
        
        return NextResponse.json({
          success: true,
          message: 'Configuration updated successfully',
          config: mlService.getConfig()
        })
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('Error in enhanced ML prediction:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// PUT - Update model configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { config } = body
    
    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'Configuration is required'
      }, { status: 400 })
    }
    
    const mlService = EnhancedMLPredictionService.getInstance()
    mlService.updateConfig(config)
    
    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      config: mlService.getConfig()
    })
    
  } catch (error) {
    console.error('Error updating ML configuration:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Generate simulated data for testing
function generateSimulatedData(drawType: string, count: number): DrawResult[] {
  const data: DrawResult[] = []
  
  for (let i = 0; i < count; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    const gagnants = []
    while (gagnants.length < 5) {
      const num = Math.floor(Math.random() * 90) + 1
      if (!gagnants.includes(num)) {
        gagnants.push(num)
      }
    }
    
    const machine = []
    while (machine.length < 5) {
      const num = Math.floor(Math.random() * 90) + 1
      if (!machine.includes(num)) {
        machine.push(num)
      }
    }
    
    data.push({
      id: `sim_${i}_${Date.now()}`,
      draw_name: drawType,
      date: date.toISOString().split('T')[0],
      gagnants: gagnants.sort((a, b) => a - b),
      machine: machine.sort((a, b) => a - b),
      created_at: date.toISOString(),
    })
  }
  
  return data
}

// DELETE - Reset models (for development/testing)
export async function DELETE(request: NextRequest) {
  try {
    const mlService = EnhancedMLPredictionService.getInstance()
    
    // Reset performance metrics
    const performanceMetrics = mlService.getPerformanceMetrics()
    performanceMetrics.clear()
    
    // Reinitialize with default config
    await mlService.initialize()
    
    return NextResponse.json({
      success: true,
      message: 'ML models reset successfully'
    })
    
  } catch (error) {
    console.error('Error resetting ML models:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

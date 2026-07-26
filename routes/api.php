<?php

use App\Http\Controllers\Api\AffectationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EquipeController;
use App\Http\Controllers\Api\HistoriquePointController;
use App\Http\Controllers\Api\InterventionController;
use App\Http\Controllers\Api\SignalementController;
use App\Http\Controllers\Api\TypeDechetController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ZoneController;
use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public authentication routes
|--------------------------------------------------------------------------
*/

Route::prefix('auth')
    ->name('auth.')
    ->group(function () {

        Route::post('/register', [AuthController::class, 'register'])
            ->name('register');

        Route::post('/login', [AuthController::class, 'login'])
            ->name('login');

        Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])
            ->name('forgot-password');

        Route::post('/reset-password', [AuthController::class, 'resetPassword'])
            ->name('reset-password');
    });


/*
|--------------------------------------------------------------------------
| Protected routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')
    ->group(function () {

        /*
        | Current authenticated user
        */
        Route::get('/user', function (Request $request) {
            return new UserResource($request->user());
        });


        /*
        | Authentication management
        */
        Route::prefix('auth')
            ->group(function () {

                Route::post('/logout', [AuthController::class, 'logout']);
            });


        /*
        | User administration
        |
        | Only administrators can manage users
        */
        Route::middleware('role:admin')
            ->apiResource('users', UserController::class)
            ->only([
                'store',
                'update',
                'destroy',
                'index',
                'show',
            ]);


        /*
        |--------------------------------------------------------------------------
        | Reference data — Types de déchets / Zones (Admin manages, all can read)
        |--------------------------------------------------------------------------
        */
        Route::apiResource('types-dechets', TypeDechetController::class);
        Route::apiResource('zones', ZoneController::class);


        /*
        |--------------------------------------------------------------------------
        | Équipes (Admin manages, Agents can read)
        |--------------------------------------------------------------------------
        */
        Route::apiResource('equipes', EquipeController::class);


        /*
        |--------------------------------------------------------------------------
        | Signalements (All authenticated users can create, Admin/Agents manage)
        |--------------------------------------------------------------------------
        */
        Route::apiResource('signalements', SignalementController::class);


        /*
        |--------------------------------------------------------------------------
        | Affectations (Admin only)
        |--------------------------------------------------------------------------
        */
        Route::apiResource('affectations', AffectationController::class)
            ->except(['update']);


        /*
        |--------------------------------------------------------------------------
        | Interventions (Agents and Admin)
        |--------------------------------------------------------------------------
        */
        Route::post('/interventions/{intervention}/cloturer', [InterventionController::class, 'cloturer'])
            ->name('interventions.cloturer');

        Route::apiResource('interventions', InterventionController::class);


        /*
        |--------------------------------------------------------------------------
        | Historique des points — lecture seule (propre utilisateur ou Admin)
        |--------------------------------------------------------------------------
        */
        Route::get('/historique-points', [HistoriquePointController::class, 'index'])
            ->name('historique-points.index');

        Route::get('/historique-points/{historiquePoint}', [HistoriquePointController::class, 'show'])
            ->name('historique-points.show');
    });

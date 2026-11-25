package com.androidmanager.testapp;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {
    private int taps = 0;
    private TextView counter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(28, 36, 28, 36);
        root.setBackgroundColor(Color.rgb(9, 18, 34));

        TextView title = new TextView(this);
        title.setText("Android Test App");
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        title.setGravity(Gravity.CENTER);
        root.addView(title, new LinearLayout.LayoutParams(-1, -2));

        TextView subtitle = new TextView(this);
        subtitle.setText("Cloud device touch and interaction test");
        subtitle.setTextColor(Color.LTGRAY);
        subtitle.setTextSize(15);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subParams = new LinearLayout.LayoutParams(-1, -2);
        subParams.setMargins(0, 12, 0, 32);
        root.addView(subtitle, subParams);

        counter = new TextView(this);
        counter.setText("Button taps: 0");
        counter.setTextColor(Color.rgb(87, 214, 232));
        counter.setTextSize(22);
        counter.setGravity(Gravity.CENTER);
        root.addView(counter, new LinearLayout.LayoutParams(-1, -2));

        Button tapButton = new Button(this);
        tapButton.setText("Test Touch");
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(-1, -2);
        buttonParams.setMargins(0, 24, 0, 12);
        root.addView(tapButton, buttonParams);
        tapButton.setOnClickListener(v -> {
            taps++;
            counter.setText("Button taps: " + taps);
            if (taps % 5 == 0) Toast.makeText(this, "Touch working!", Toast.LENGTH_SHORT).show();
        });

        Button infoButton = new Button(this);
        infoButton.setText("Device Information");
        root.addView(infoButton, new LinearLayout.LayoutParams(-1, -2));
        infoButton.setOnClickListener(v ->
            Toast.makeText(this, "Android SDK: " + android.os.Build.VERSION.SDK_INT, Toast.LENGTH_LONG).show()
        );

        TextView footer = new TextView(this);
        footer.setText("Use this app to test screen, touch, and basic controls.");
        footer.setTextColor(Color.LTGRAY);
        footer.setTextSize(13);
        footer.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams footParams = new LinearLayout.LayoutParams(-1, -2);
        footParams.setMargins(0, 36, 0, 0);
        root.addView(footer, footParams);

        setContentView(root);
    }
}
